import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

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
};

export function getUploadLimitBytes() {
  const configuredLimit = Number(process.env.UPLOAD_MAX_BYTES);

  if (Number.isFinite(configuredLimit) && configuredLimit > 0) {
    return configuredLimit;
  }

  return 5 * 1024 * 1024;
}

export function getUploadRoot() {
  const uploadDirectory = process.env.UPLOAD_DIR ?? "./uploads";

  if (path.isAbsolute(uploadDirectory)) {
    return path.normalize(uploadDirectory);
  }

  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), uploadDirectory);
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
  const absolutePath = path.join(getUploadRoot(), relativePath);
  await rm(absolutePath, { force: true });
}

export async function storeProofUpload(file: File, uploadScope = "public-submissions"): Promise<StoredUpload> {
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
    throw new Error(`Proof file must be ${Math.floor(uploadLimitBytes / 1024 / 1024)} MB or smaller.`);
  }

  if (!allowedMimeTypes.has(mimeType)) {
    throw new Error("Proof file must be a PDF, JPG, PNG, or WebP image.");
  }

  const extension = path.extname(originalFilename).toLowerCase();
  const expectedExtension = allowedExtensions.get(mimeType);

  if (!expectedExtension || (mimeType === "image/jpeg" ? ![".jpg", ".jpeg"].includes(extension) : extension !== expectedExtension)) {
    throw new Error("Proof file extension does not match the uploaded file type.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasAllowedFileSignature(buffer, mimeType)) {
    throw new Error("Proof file content does not match the uploaded file type.");
  }

  const storedExtension = mimeType === "image/jpeg" ? ".jpg" : expectedExtension;
  const storedFilename = `${randomUUID()}${storedExtension}`;
  const uploadDirectory = path.join(getUploadRoot(), uploadScope);
  const absolutePath = path.join(uploadDirectory, storedFilename);
  const relativePath = path.join(uploadScope, storedFilename);
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(absolutePath, buffer, { flag: "wx" });

  return {
    originalFilename,
    storedFilename,
    mimeType,
    sizeBytes,
    contentHash,
    storagePath: relativePath,
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
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}