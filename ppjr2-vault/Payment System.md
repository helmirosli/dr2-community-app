# Payment System

Part of [[Architecture Overview]]. Related: [[Data Model]], [[Public Submission Flow]], [[Special Collections]].

---

## Two Payment Types

| Type | Description |
|---|---|
| `MONTHLY_FEE` | Regular monthly maintenance fee (RM 50 / 5000 sen per unit) |
| `SPECIAL_COLLECTION` | One-off levy tied to a [[Special Collections\|SpecialCollection]] |

---

## Recording a Payment (Staff)

Path: `/payments/new`  
Action: `lib/actions/payments.ts`

1. Staff selects resident, amount, method, and coverage months.
2. Server Action calls `buildMonthlyCoverageRows()` to distribute the amount across months.
3. A `Payment` record is created along with `PaymentCoverage` rows (one per month).
4. Optional file uploads are attached via [[File Uploads]].

---

## Coverage Allocation

**Source:** [lib/payments/coverage.ts](lib/payments/coverage.ts)

The `buildMonthlyCoverageRows()` function distributes an amount across selected months:

1. For each selected month: apply `min(amountNeeded, remainingAmount)`.
2. `amountNeeded = DEFAULT_MONTHLY_FEE_SEN - existingAmountForThatMonth` (handles top-ups on partial months).
3. If `remainingAmount > 0` after all selected months → **carry-forward**: auto-extend to future months (max 24 months ahead).

Coverage status per month:
- `PAID` — full fee applied
- `PARTIAL` — less than full fee applied
- `ADJUSTED` — manually corrected

---

## Money Handling

**Source:** [lib/money.ts](lib/money.ts)

- All amounts stored as **integers in sen** (1 sen = RM 0.01).
- `DEFAULT_MONTHLY_FEE_SEN = 5000` (RM 50).
- `formatRM(amountSen)` formats for display: `5000` → `"RM 50.00"`.

---

## Fee Plans

`FeePlan` records allow the monthly fee to change over time. Each `PaymentCoverage` can reference the `FeePlan` active at that time.  
Currently a single default of RM 50 is assumed in most logic.

---

## Duplicate Detection

**Source:** [lib/payments/duplicates.ts](lib/payments/duplicates.ts)

Checks for existing payments on the same `(resident, year, month)` before recording to warn staff of potential duplicates.

---

## Payment Review Queue

Public submissions land in the review queue on the [[Dashboard]] and the `/payments` page. Staff can approve or reject them. See [[Public Submission Flow]].

---

## Reports

Monthly and yearly collection summaries are exported as PDF or Excel. See [[Reports & Exports]].
