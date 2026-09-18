# File Uploads

Part of [[Architecture Overview]]. Related: [[Payment System]], [[Public Submission Flow]], [[Data Model]].

---

## Storage Backend

Files are stored in **Google Cloud Storage (GCS)**.

**Package:** `@google-cloud/storage`  
**Helper:** [lib/uploads.ts](lib/uploads.ts)

**Env vars needed:**
- `GCS_BUCKET_NAME`
- `GOOGLE_APPLICATION_CREDENTIALS` (or equivalent service account key)

---

## Upload Model

The `Upload` record in [[Data Model]] tracks each file:

| Field | Notes |
|---|---|
| `storagePath` | Path in the GCS bucket |
| `originalFilename` | What the user named the file |
| `storedFilename` | Deduplicated/sanitised name used in storage |
| `mimeType` | e.g. `image/jpeg`, `application/pdf` |
| `sizeBytes` | File size |
| `contentHash` | SHA hash for deduplication |
| `url` | Optional pre-signed or public URL |

---

## Attachment Points

An `Upload` can be linked to either:
- A **`Payment`** — staff-recorded payment receipt
- A **`PublicPaymentSubmission`** — resident-submitted proof

When a submission is approved, its uploads are re-linked to the newly created `Payment`.

---

## Download Proxy

**Route:** `app/api/uploads/[...path]/route.ts`

Files are served through this API route rather than directly from GCS. This allows:
- Auth checks before serving files
- Abstracting the storage backend

---

## UI Components

| Component | Purpose |
|---|---|
| `app/components/file-input.tsx` | File picker input |
| `app/components/file-viewer.tsx` | Preview/download attached files |
