# Service — Review Submissions

Part of [[Architecture Overview]] → [[Public Submission Flow]].

**Source:** [lib/actions/review-submissions.ts](lib/actions/review-submissions.ts)

---

## Responsibilities

Handles staff approval and rejection of `PublicPaymentSubmission` records. On approval, converts a submission into a real `Payment` with coverage rows.

---

## `approveSubmission(submissionId)`

All logic runs inside a single `prisma.$transaction`.

**Steps:**
1. `assertDashboardUser()`
2. Fetch submission — bail silently if not found or not `PENDING_REVIEW`
3. Look up resident by `unitNumber` — if unit no longer exists, auto-reject with reason
4. Build covered months list from the submission's `coverageStart/End` fields
5. Check for fully-paid months (existing `PaymentCoverage` with `amountApplied >= 5000 sen`) — auto-reject if found; partial months are allowed
6. Build `existingCoverageMap` for smart amount distribution
7. Create `Payment` + `PaymentCoverage` rows via `buildMonthlyCoverageRows()` from [[Coverage Allocation]]
8. If `SPECIAL_COLLECTION`: increment `SpecialCollectionAssignment.amountPaid`
9. Re-link all `Upload` records from submission to the new payment (`upload.paymentId = payment.id`)
10. Set submission `status → APPROVED`
11. Write `AuditLog` (`action: "APPROVE"`)
12. `revalidatePath("/dashboard")`

**Auto-reject cases (written to DB, not thrown):**

| Case | Audit action |
|---|---|
| Resident unit not found | `REJECT_MISSING_RESIDENT` |
| Month already fully paid | `REJECT_DUPLICATE_COVERAGE` |

---

## `rejectSubmission(submissionId)`

Simpler path — sets `status → REJECTED` with a default reason string, records reviewer + timestamp, writes `AuditLog` (`action: "REJECT"`).

---

## Key Behaviour

- Partial-month payments are **allowed** through — only a month with `amountApplied >= RM 50` blocks approval.
- Upload records are **moved** (not copied) to the new `Payment`, so receipts stay linked after approval.
- Both functions are idempotent if the submission is already processed (status ≠ `PENDING_REVIEW` → no-op).

---

## Related

- [[Service - Public Submissions]] — creates the submissions being reviewed
- [[Service - Payment Actions]] — parallel staff-side payment creation flow
- [[Coverage Allocation]] — `buildMonthlyCoverageRows` used here
- [[Audit Log]] — every outcome is logged
- [[Dashboard]] — review queue triggers `revalidatePath`
