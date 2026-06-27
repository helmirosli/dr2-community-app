# Service — Upload Proxy API

Part of [[Architecture Overview]] → [[File Uploads]].

**Source:** [app/api/uploads/[...path]/route.ts](app/api/uploads/[...path]/route.ts)

---

## Responsibilities

Proxies file downloads from Google Cloud Storage through the Next.js server. Ensures uploaded receipts are only accessible to authenticated staff, not directly via public GCS URLs.

---

## `GET /api/uploads/[...path]`

The `[...path]` catch-all captures the full file path (e.g. `payments/uuid.pdf`).

**Flow:**
1. `requireDashboardUser()` — unauthenticated requests are redirected to login
2. Resolve the GCS path from the URL segments
3. Fetch the file from GCS (via `getGcsBucket()` from [[Service - GCS Upload]])
4. Stream the file bytes back to the browser with the correct `Content-Type`

---

## Why Proxy Instead of Direct GCS URLs?

- Keeps GCS bucket private (no public access required)
- Auth check is enforced at the Next.js layer
- Signed URLs (1-hour expiry) are an alternative but add complexity; the proxy keeps it simple

---

## Related

- [[Service - GCS Upload]] — bucket client + path resolution
- [[Service - Auth]] — `requireDashboardUser()` guard
- [[File Uploads]] — domain overview
