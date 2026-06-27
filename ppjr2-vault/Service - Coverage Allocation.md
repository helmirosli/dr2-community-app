# Service — Coverage Allocation

Part of [[Architecture Overview]] → [[Payment System]].

**Source:** [lib/payments/coverage.ts](lib/payments/coverage.ts)

---

## Responsibilities

Core algorithm that distributes a payment amount across monthly coverage slots. Used during submission approval and has a parallel inline copy in [[Service - Payment Actions]].

---

## `buildMonthlyCoverageRows(residentId, coveredMonths, amountSen, existingCoverageMap?)`

Takes a list of selected months and an amount in sen, returns an array of `PaymentCoverage` create-data rows.

**Algorithm:**

For each selected month:
1. Look up `existingAmount` from the optional `existingCoverageMap` (sum of any partial payments already recorded for that month)
2. `amountNeeded = max(0, DEFAULT_MONTHLY_FEE_SEN - existingAmount)` — only fill up what's missing
3. `amountApplied = min(amountNeeded || DEFAULT_MONTHLY_FEE_SEN, remainingAmount)` — apply what we can
4. Deduct from `remainingAmount`
5. Status: `PAID` if `existingAmount + amountApplied >= DEFAULT_MONTHLY_FEE_SEN`, else `PARTIAL`

**Carry-forward (if `remainingAmount > 0` after all selected months):**
- Auto-extends into future consecutive months
- Capped at **24 months** of extension
- Same per-month distribution logic applies

This means an overpayment is never lost — it rolls forward to cover upcoming months.

---

## `getCoverageMonthCount(startYear, startMonth, endYear, endMonth)`

Utility — returns the number of months in a given range. Delegates to `expandMonthRange()` in `lib/months.ts`.

---

## Constants

`DEFAULT_MONTHLY_FEE_SEN = 5000` (RM 50) from `lib/money.ts`.

---

## Related

- [[Service - Review Submissions]] — primary consumer (`buildMonthlyCoverageRows`)
- [[Service - Payment Actions]] — has an inline copy of the distribution logic
- [[Service - Duplicate Detection]] — checks the coverage records this service creates
- [[Data Model]] — creates `PaymentCoverage` rows
