# Service — Duplicate Detection

Part of [[Architecture Overview]] → [[Payment System]].

**Source:** [lib/payments/duplicates.ts](lib/payments/duplicates.ts)

---

## Responsibilities

Prevents double-submission of payments — both public submissions and official coverage records. Two distinct layers of detection.

---

## `findDuplicatePublicSubmission(input)`

Used by [[Service - Public Submissions]] before saving a new submission.

Looks for any existing `PENDING_REVIEW` submission for the same `unitNumber` + `paymentType` that overlaps with the new submission's coverage range.

**Overlap is confirmed if any of:**
- Same reference number (`referenceNo`)
- Same file content hash (`contentHash` match on uploads)
- Same amount (for `SPECIAL_COLLECTION`)
- Any date range overlap for `MONTHLY_FEE` (always treated as duplicate if months overlap)

Uses `areMonthRangesOverlapping()` from `lib/months.ts` to detect coverage overlap.

Returns the duplicate submission object or `null`.

---

## `findExistingOfficialCoverage(residentId, startYear, startMonth, endYear, endMonth)`

Checks whether any month in the given range already has a **fully paid** `PaymentCoverage` record (`amountApplied >= DEFAULT_MONTHLY_FEE_SEN`).

Used during submission approval in [[Service - Review Submissions]] to prevent approving a submission that would double-cover an already-paid month.

Sums `amountApplied` across all coverage rows for the same `(resident, year, month)` key before comparing — correctly handles partial payments that sum to full coverage.

Returns `{ year, month, status: "PAID" }` for the first fully-paid month found, or `null`.

---

## `findExistingOfficialCoverageByUnitNumber(...)`

Convenience wrapper — resolves `unitNumber` → `residentId` then delegates to `findExistingOfficialCoverage`. Used in [[Service - Public Submissions]] where only the unit number is known.

---

## Related

- [[Service - Public Submissions]] — calls `findDuplicatePublicSubmission` + `findExistingOfficialCoverageByUnitNumber`
- [[Service - Review Submissions]] — calls `findExistingOfficialCoverage` on approval
- [[Coverage Allocation]] — related: builds the coverage rows that this service checks
- [[Data Model]] — `PaymentCoverage`, `PublicPaymentSubmission`
