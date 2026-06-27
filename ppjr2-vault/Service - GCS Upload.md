# Service — GCS Upload

Part of [[Architecture Overview]] → [[File Uploads]].

**Source:** [lib/uploads.ts](lib/uploads.ts)

---

## Responsibilities

All Google Cloud Storage interactions: storing proof files, generating URLs, deleting orphaned files. Also enforces file type and size rules before anything reaches GCS.

---

## Allowed File Types

| MIME type | Extension |
|---|---|
| `application/pdf` | `.pdf` |
| `image/jpeg` | `.jpg` / `.jpeg` |
| `image/png` | `.png` |
| `image/webp` | `.webp` |

Default max size: **5 MB** (overridden by `UPLOAD_MAX_BYTES` env var).

---

## `storeProofUpload(file, uploadScope?)`

Main upload function. Called by [[Service - Payment Actions]] and [[Service - Public Submissions]].

**Validation before upload:**
1. Filename not empty
2. File size > 0 and ≤ limit
3. MIME type in allowlist
4. File extension matches MIME type
5. **Magic byte check** — reads file header bytes to verify content actually matches declared type:
   - PDF: starts with `%PDF`
   - JPEG: `0xFF 0xD8 0xFF`
   - PNG: `0x89 PNG\r\n\x1a\n` (8 bytes)
   - WebP: `RIFF....WEBP`

**On success:**
- Generates a `randomUUID()` filename (no user-controlled names in storage)
- Stores at `{uploadScope}/{uuid}.{ext}` in the GCS bucket
- Computes SHA-256 `contentHash` for duplicate detection
- Returns a `StoredUpload` object with all metadata

`uploadScope` defaults to `"public-submissions"`, staff payments use `"payments"`.

---

## `removeStoredUpload(storagePath)`

Deletes a GCS file. Called as a rollback if the DB transaction fails after a file was uploaded. `ignoreNotFound: true` — safe to call even if the file doesn't exist.

---

## `getSignedFileUrl(storagePath)`

Generates a **V4 signed URL** (1 hour expiry) for private file access. Used by the download proxy route.

---

## `getPublicFullUrl(storagePath)`

Builds a public URL from `GCS_BASE_URL` + `GCS_BASE_PATH` + `storagePath`. Used when the bucket is configured for public access.

---

## Helper Functions

| Function | Purpose |
|---|---|
| `getSingleUploadedFile(formData, field)` | Extracts one file from FormData, rejects if multiple files |
| `getUploadedFile(value)` | Coerces FormData entry to `File \| null` |
| `isEmptyFile(value)` | Detects browser-sent empty file stub |
| `getGcsBucket()` | Instantiates the GCS `Storage` client + returns bucket |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `GCS_BUCKET_NAME` | Required — target bucket |
| `GCS_PROJECT_ID` | GCS project |
| `GCS_CLIENT_EMAIL` | Service account email |
| `GCS_PRIVATE_KEY` | Service account private key (`\n` → newline) |
| `GCS_BASE_URL` | Public base URL for direct file links |
| `GCS_BASE_PATH` | Optional path prefix in the bucket |
| `UPLOAD_MAX_BYTES` | Override default 5 MB limit |

---

## Related

- [[File Uploads]] — domain overview
- [[Service - Payment Actions]] — calls `storeProofUpload("payments")`
- [[Service - Public Submissions]] — calls `storeProofUpload()` (default scope)
- [[Service - Duplicate Detection]] — uses `contentHash` to detect duplicate receipts
