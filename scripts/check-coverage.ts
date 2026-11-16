// Self-check for the fee allocator. Run: npm run check:coverage
import assert from "node:assert/strict";

import { DEFAULT_MONTHLY_FEE_SEN as FEE } from "@/lib/money";
import { buildMonthlyCoverageRows, getPendingSubmissionsMap } from "@/lib/payments/coverage";

const pick = (rows: ReturnType<typeof buildMonthlyCoverageRows>) =>
  rows.map((r) => `${r.year}-${r.month}:${r.amountApplied}:${r.status}`);

assert.equal(FEE, 5000);

// Exact payment for the selected months.
assert.deepEqual(pick(buildMonthlyCoverageRows("r", [{ year: 2025, month: 1 }, { year: 2025, month: 2 }], 10000)), [
  "2025-1:5000:PAID",
  "2025-2:5000:PAID",
]);

// Overpayment carries forward into the next month as PARTIAL.
assert.deepEqual(pick(buildMonthlyCoverageRows("r", [{ year: 2025, month: 1 }, { year: 2025, month: 2 }], 12500)), [
  "2025-1:5000:PAID",
  "2025-2:5000:PAID",
  "2025-3:2500:PARTIAL",
]);

// Underpayment stops early.
assert.deepEqual(pick(buildMonthlyCoverageRows("r", [{ year: 2025, month: 1 }, { year: 2025, month: 2 }], 3000)), [
  "2025-1:3000:PARTIAL",
]);

// Tops up an existing partial month, then carries the rest; wraps December → January.
assert.deepEqual(
  pick(buildMonthlyCoverageRows("r", [{ year: 2025, month: 12 }], 5000, new Map([["2025:12", 2000]]))),
  ["2025-12:3000:PAID", "2026-1:2000:PARTIAL"],
);

// Pending submissions preview on /status and /reports uses the same allocator.
const pending = getPendingSubmissionsMap([
  { unitNumber: "7", amountSen: 12500, coverageStartYear: 2025, coverageStartMonth: 1, coverageEndYear: 2025, coverageEndMonth: 2 },
]);
assert.deepEqual([...pending.entries()], [
  ["7:2025:1", { appliedSen: 5000, isCarryForward: false, totalPending: 12500 }],
  ["7:2025:2", { appliedSen: 5000, isCarryForward: true, totalPending: 12500 }],
  ["7:2025:3", { appliedSen: 2500, isCarryForward: true, totalPending: 12500 }],
]);

console.log("coverage self-check: ok");
