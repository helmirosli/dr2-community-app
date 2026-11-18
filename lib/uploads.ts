import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";

import { Storage } from "@google-cloud/storage";

const allowedExtensions = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export type StoredUpload = {
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storagePath: string;
  /** A direct link, kept only when the files are public. Private files are opened through /api/uploads/<path>. */
  url: string | null;
};

export function getUploadLimitBytes() {
  const configuredLimit = Number(process.env.UPLOAD_MAX_BYTES);

  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return configuredLimit;
  }

  return 5 * 1024 * 1024;
}

// Local development without real Google credentials: keep uploads on disk in ./uploads (gitignored).
// Production always uses GCS.
const LOCAL_UPLOAD_ROOT = join(process.cwd(), "uploads");

export function usesLocalUploads() {
  if (process.env.NODE_ENV === "production") return false;
  const email = process.env.GCS_CLIENT_EMAIL ?? "";
  return !email || !process.env.GCS_PRIVATE_KEY || email.startsWith("your-");
}

function localUploadPath(relativePath: string) {
  const full = normalize(join(LOCAL_UPLOAD_ROOT, relativePath));
  if (!full.startsWith(LOCAL_UPLOAD_ROOT + sep)) throw new Error("Invalid upload path.");
  return full;
}

/** Reads a locally stored upload (dev only); null if missing. */
export async function readLocalUpload(relativePath: string) {
  try {
    return await readFile(localUploadPath(relativePath));
  } catch {
    return null;
  }
}

export function getGcsBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
  });

  const bucket = storage.bucket(bucketName);

  return { storage, bucket };
}

export function getPublicFullUrl(storagePath: string): string {
  const baseUrl = (process.env.GCS_BASE_URL ?? "").replace(/\/$/, "");
  const basePath = (process.env.GCS_BASE_PATH ?? "").replace(/^\/|\/$/g, "");
  const cleanPath = storagePath.replace(/^\/|\/$/g, "");

  const parts = [baseUrl, basePath, cleanPath].filter(Boolean);
  return parts.join("/").replace(/\/+/g, "/");
}

export async function getSignedFileUrl(storagePath: string): Promise<string> {
  const { bucket } = getGcsBucket();

  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return url;
}

export function isEmptyFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size === 0 && value.name === "";
}

export function getUploadedFile(value: FormDataEntryValue | null) {
  if (!value || isEmptyFile(value)) {
    return null;
  }

  if (!(value instanceof File)) {
    throw new Error("Upload must be a file.");
  }

  return value;
}

export function getSingleUploadedFile(formData: FormData, fieldName: string) {
  const files = formData.getAll(fieldName).filter((value) => !isEmptyFile(value));

  if (files.length > 1) {
    throw new Error("Please upload only one proof file.");
  }

  return getUploadedFile(files[0] ?? null);
}

export async function removeStoredUpload(relativePath: string) {
  if (usesLocalUploads()) {
    await rm(localUploadPath(relativePath), { force: true });
    return;
  }
  const { bucket } = getGcsBucket();
  await bucket.file(relativePath).delete({ ignoreNotFound: true });
}

export async function storeProofUpload(
  file: File,
  uploadScope = "public-submissions"
): Promise<StoredUpload> {
  const originalFilename = file.name.trim();
  const sizeBytes = file.size;
  const uploadLimitBytes = getUploadLimitBytes();

  if (!originalFilename) {
    throw new Error("Proof file is missing a filename.");
  }

  if (sizeBytes <= 0) {
    throw new Error("Proof file is empty.");
  }

  if (sizeBytes > uploadLimitBytes) {
    throw new Error(
      `Proof file must be ${Math.floor(uploadLimitBytes / 1024 / 1024)} MB or smaller.`
    );
  }

  // Trust the bytes, not the name or the browser's reported type: phone downloads are often
  // misnamed (a WebP saved as .jpg). Accept any real JPEG/PNG/WebP/PDF and store it as what it is.
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer);

  if (!detected) {
    throw new Error(
      isHeic(buffer)
        ? "iPhone HEIC photos aren't supported. Please send a screenshot of the receipt, or a JPG/PNG/PDF."
        : "Proof file must be a real PDF, JPG, PNG or WebP image."
    );
  }

  const mimeType = detected;
  const storedExtension = allowedExtensions.get(mimeType)!;

  const storedFilename = `${randomUUID()}${storedExtension}`;

  const gcsPath = `${uploadScope}/${storedFilename}`;

  const contentHash = createHash("sha256").update(buffer).digest("hex");

  let url: string | null;

  if (usesLocalUploads()) {
    const target = localUploadPath(gcsPath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer);
    url = `/api/uploads/${gcsPath}`;
  } else {
    const { bucket } = getGcsBucket();
    await bucket.file(gcsPath).save(buffer, { contentType: mimeType, resumable: false });
    const baseUrl = (process.env.GCS_BASE_URL ?? "").replace(/\/$/, "");
    url = process.env.GCS_PUBLIC_FILES === "true" ? `${baseUrl}/${gcsPath}` : null;
  }

  return {
    originalFilename,
    storedFilename,
    mimeType,
    sizeBytes,
    contentHash,
    storagePath: gcsPath,
    url,
  };
}

/** Identifies an allowed proof file from its first bytes; null if it isn't one. */
export function detectFileType(buffer: Buffer): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

function isHeic(buffer: Buffer) {
  return buffer.subarray(4, 8).toString("latin1") === "ftyp" && /^(hei[cx]|hev[cx]|mif1|msf1)$/.test(buffer.subarray(8, 12).toString("latin1"));
}
