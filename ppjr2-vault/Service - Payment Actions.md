# Service — Payment Actions

Part of [[Architecture Overview]] → [[Payment System]].

**Source:** [lib/actions/payments.ts](lib/actions/payments.ts)

---

## Responsibilities

Staff-side server action for recording payments. Handles form validation, duplicate detection, file upload, DB transaction, and audit logging.

---

## `getResidentSnapshot(residentId)`

Returns a prefill snapshot for the `/payments/new` form:

| Field | Description |
|---|---|
| `unitNumber`, `name` | Resident identity |
| `latestCoverage` | Most recently paid `{year, month}` |
| `outstandingMonths` | Months in the current year with no coverage record |
| `assignedCollections` | Active special collection assignments + outstanding balance |

Requires `assertDashboardUser()` — staff only.

---

## `createPayment(_previousState, formData)`

**Zod schema validates:**
- `residentId`, `paymentType` (`MONTHLY_FEE` | `SPECIAL_COLLECTION`)
- `amount` in RM (converted to sen), max RM 100,000
- `paymentDate`, `method`
- Coverage range (`startYear/Month` → `endYear/Month`, max 24 months)
- `specialCollectionId`, `referenceNo`, `notes` (all optional)
- `allowAdjustment` checkbox — bypasses expected-amount guard

**Flow:**
1. `assertDashboardUser()`
2. Zod validation
3. Reject if coverage span > 24 months
4. Reject if `amount ≠ months × RM 50` and `allowAdjustment` not checked
5. Check resident exists
6. Check for duplicate coverage (same resident + month already paid)
7. Upload proof file via [[Service - GCS Upload]]
8. `prisma.$transaction`:
   - Create `Payment` + `PaymentCoverage` rows
   - Increment `SpecialCollectionAssignment.amountPaid` if levy payment
   - Attach `Upload` record
9. Write `AuditLog` (`action: "CREATE"`)
10. On DB failure → rollback GCS file delete
11. `revalidatePath` + `redirect` to `/payments?created={id}`

---

## Related

- [[Service - Review Submissions]] — approval path uses same coverage logic
- [[Service - GCS Upload]] — file handling
- [[Service - Duplicate Detection]] — coverage overlap check
- [[Audit Log]] — appended on every create
- [[Coverage Allocation]] — month distribution algorithm
