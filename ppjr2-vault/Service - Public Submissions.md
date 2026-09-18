# Service — Public Submissions

Part of [[Architecture Overview]] → [[Public Submission Flow]].

**Source:** [lib/actions/public-submissions.ts](lib/actions/public-submissions.ts)

---

## Responsibilities

The unauthenticated server action that accepts a resident's self-reported payment. No login required. Validates, spam-checks, deduplicates, uploads receipt, then saves a `PublicPaymentSubmission` record for staff review.

---

## `createPublicSubmission(_previousState, formData)`

**Validation order:**

| Step | Check |
|---|---|
| 1 | Zod schema (`publicSubmissionSchema` from [[Service - Validation]]) |
| 2 | Cloudflare Turnstile token — verified server-side via [[Service - Turnstile]] |
| 3 | Non-cash payments must include a proof file |
| 4 | Upload file to GCS via [[Service - GCS Upload]] |
| 5 | Resident unit number must exist in DB |
| 6 | Duplicate submission check via [[Service - Duplicate Detection]] |
| 7 | If `SPECIAL_COLLECTION`: unit must have an assignment for the selected collection |
| 8 | If `MONTHLY_FEE`: none of the selected months can already be fully paid |

If any check fails after the file has been uploaded, the GCS file is **deleted** before returning the error.

**On success:**
- Creates `PublicPaymentSubmission` with status `PENDING_REVIEW`
- Attaches `Upload` record
- `revalidatePath("/dashboard")`
- Returns `{ ok: true, message: "..." }`

---

## Honeypot Field

`website` field in the Zod schema — max 0 characters. Bots that fill it in fail validation silently. See [[Service - Validation]].

---

## Related

- [[Service - Review Submissions]] — staff side that processes these submissions
- [[Service - Turnstile]] — CAPTCHA verification
- [[Service - GCS Upload]] — receipt upload + rollback
- [[Service - Duplicate Detection]] — prevents double submissions
- [[Service - Validation]] — `publicSubmissionSchema`
