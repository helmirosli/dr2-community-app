# Public Submission Flow

Part of [[Architecture Overview]]. Related: [[Payment System]], [[File Uploads]], [[Authentication & Authorization]].

---

## Overview

Residents can submit their own payment proof **without logging in** via `/submit`. Staff then review and approve or reject the submission from the [[Dashboard]] or `/payments`.

---

## Submission Form (`/submit`)

**Source:** `app/(public)/submit/`

The form collects:
- Unit number + resident name + phone
- Payment type (monthly fee or special collection)
- Amount, date, method, reference number
- Coverage period (start month → end month)
- Payment proof file upload (receipt image/PDF)
- **Cloudflare Turnstile** CAPTCHA token — verified server-side before saving

On submit → `lib/actions/public-submissions.ts` → creates a `PublicPaymentSubmission` record with status `PENDING_REVIEW`.

---

## Turnstile CAPTCHA

**Source:** [lib/turnstile.ts](lib/turnstile.ts)

Protects the public form from bot spam. The widget token is verified against the Cloudflare API server-side before the submission is accepted.

**Env var:** `TURNSTILE_SECRET_KEY`

---

## Status Check (`/status`)

Residents can look up their submission status by entering their unit number. Returns submission history with current status.

---

## Review Queue (Staff Side)

**Dashboard widget** — shows up to 5 pending submissions with inline approve/reject buttons.  
**`/payments` page** — full paginated queue.

### Approval

`lib/actions/review-submissions.ts` → `approveSubmission(id)`:
1. Validates the submission is still `PENDING_REVIEW`.
2. Creates a real `Payment` record + `PaymentCoverage` rows (same logic as [[Payment System]]).
3. Moves uploaded files to the new `Payment`.
4. Sets submission status → `APPROVED`.

### Rejection

Sets submission status → `REJECTED` with an optional `reviewReason`.

### Quarantine

Status `QUARANTINED` — flagged as suspicious, removed from normal queue.

---

## Submission Status Flow

```
PENDING_REVIEW
  ├─ → APPROVED  (staff approves → creates Payment)
  ├─ → REJECTED  (staff rejects with reason)
  └─ → QUARANTINED (flagged as suspicious)
```

---

## File Uploads

Receipts attached to submissions are stored in GCS. See [[File Uploads]].
