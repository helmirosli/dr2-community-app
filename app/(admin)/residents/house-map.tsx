import { HouseTile, StatusPill } from "@/app/components/status";
import type { Dictionary } from "@/lib/i18n";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { prisma } from "@/lib/prisma";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { monthState, type MonthState } from "@/lib/status";

/** "Peta" view of /residents: every house in number order, coloured by this month's status (spec §5.8). */
export async function HouseMap({ t }: { t: Dictionary }) {
  const now = new Date();
  const m = now.getMonth();
  const [grid, residents, pending] = await Promise.all([
    getYearGridData({ year: now.getFullYear(), includeInactive: true }),
    prisma.resident.findMany({ select: { id: true, unitNumber: true, name: true } }),
    prisma.publicPaymentSubmission.findMany({
      where: { status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
      select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
    }),
  ]);
  const byUnit = new Map(residents.map((r) => [r.unitNumber, r]));
  const pendingMap = getPendingSubmissionsMap(pending);

  const houses = [...grid.rows]
    .sort((a, b) => Number(a.unitNumber) - Number(b.unitNumber) || a.unitNumber.localeCompare(b.unitNumber))
    .map((row) => ({
      unit: row.unitNumber,
      resident: byUnit.get(row.unitNumber),
      state: monthState({
        amountSen: row.months[m],
        override: row.monthStatusOverrides[m],
        residentStatus: row.status,
        isFuture: false,
        pending: pendingMap.has(`${row.unitNumber}:${now.getFullYear()}:${m + 1}`),
      }),
    }));

  const legend: MonthState[] = ["paid", "pending", "partial", "unpaid", "hold"];

  return (
    <section className="ui-card grid gap-5 p-5 sm:p-6">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
        {houses.map((h) => (
          <div key={h.unit} className="grid gap-1 text-center">
            <HouseTile unit={h.unit} state={h.state} label={t.states[h.state]} href={h.resident ? `/residents/${h.resident.id}` : undefined} />
            <span className="truncate text-[11px] text-slate-500">{h.resident?.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {legend.map((s) => (
          <StatusPill key={s} state={s} label={`${t.states[s]} · ${houses.filter((h) => h.state === s || (s === "paid" && h.state === "ahead")).length}`} />
        ))}
      </div>
    </section>
  );
}
