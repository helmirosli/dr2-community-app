import { createHash, randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  url: string;
};

export function getUploadLimitBytes() {
  const configuredLimit = Number(process.env.UPLOAD_MAX_BYTES);

  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return configuredLimit;
  }

  return 5 * 1024 * 1024;
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
  const { bucket } = getGcsBucket();
  await bucket.file(relativePath).delete({ ignoreNotFound: true });
}

export async function storeProofUpload(
  file: File,
  uploadScope = "public-submissions"
): Promise<StoredUpload> {
  const originalFilename = file.name.trim();
  const mimeType = file.type;
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

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error("Proof file must be a PDF, JPG, PNG, or WebP image.");
  }

  const extension = originalFilename.substring(
    originalFilename.lastIndexOf(".")
  ).toLowerCase();

  const expectedExtension = allowedExtensions.get(mimeType);

  if (
    !expectedExtension ||
    (mimeType === "image/jpeg"
      ? ![".jpg", ".jpeg"].includes(extension)
      : extension !== expectedExtension)
  ) {
    throw new Error("Proof file extension does not match file type.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasAllowedFileSignature(buffer, mimeType)) {
    throw new Error("File content does not match file type.");
  }

  const storedExtension =
    mimeType === "image/jpeg" ? ".jpg" : expectedExtension;

  const storedFilename = `${randomUUID()}${storedExtension}`;

  const gcsPath = `${uploadScope}/${storedFilename}`;

  const contentHash = createHash("sha256").update(buffer).digest("hex");

  const { bucket } = getGcsBucket();

  const gcsFile = bucket.file(gcsPath);

  await gcsFile.save(buffer, {
    contentType: mimeType,
    resumable: false,
  });

  const gcsBaseUrl = (process.env.GCS_BASE_URL ?? "").replace(/\/$/, "");
  const bucketName = process.env.GCS_BUCKET_NAME ?? "";
  const url = `${gcsBaseUrl}/${bucketName}/${gcsPath}`;

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

function hasAllowedFileSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 4).toString("utf8") === "%PDF";
  }

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return buffer
      .subarray(0, 8)
      .equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}