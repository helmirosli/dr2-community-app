import { FileSpreadsheet, FileText, Search } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";
import { StatusPill, stateStyles } from "@/app/components/status";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { clampReportYear } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { prisma } from "@/lib/prisma";
import { monthState, type MonthState } from "@/lib/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ReportsPageProps = {
  searchParams: Promise<{
    year?: string;
    includeInactive?: string;
    q?: string;
  }>;
};

function fmtCell(amountSen: number) {
  return `RM${(amountSen / 100).toFixed(2)}`;
}

const TILE = "grid min-h-8 min-w-14 place-items-center rounded-lg px-1 text-[11px] font-semibold tabular-nums";
const CELL = "border-b border-black/5 p-1 text-center group-hover:bg-[#fafafc]";
const STICKY_CELL = "sticky left-0 z-10 border-b border-black/5 bg-white group-hover:bg-[#fafafc]";

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const t = await getDictionary();

  const now = new Date();
  const selectedYear = clampReportYear(params.year, now.getFullYear());
  const includeInactive = params.includeInactive !== "off";
  const query = params.q?.trim() ?? "";

  const { rows: unsortedRows, specialCollections } = await getYearGridData({
    year: selectedYear,
    includeInactive,
  });

  // Fetch pending submissions
  const pendingSubmissions = await prisma.publicPaymentSubmission.findMany({
    where: {
      paymentType: "MONTHLY_FEE",
      status: "PENDING_REVIEW",
      coverageStartYear: { lte: selectedYear },
      coverageEndYear: { gte: selectedYear },
    },
    select: {
      unitNumber: true,
      amountSen: true,
      coverageStartYear: true,
      coverageStartMonth: true,
      coverageEndYear: true,
      coverageEndMonth: true,
    },
  });

  const pendingMap = getPendingSubmissionsMap(pendingSubmissions);

  // Fetch pending special collection submissions: key = "unitNumber:collectionId"
  const pendingCollectionSubmissions = await prisma.publicPaymentSubmission.findMany({
    where: {
      paymentType: "SPECIAL_COLLECTION",
      status: "PENDING_REVIEW",
      specialCollectionId: { not: null },
    },
    select: {
      unitNumber: true,
      amountSen: true,
      specialCollectionId: true,
    },
  });

  const pendingCollectionMap = new Map<string, number>();
  for (const sub of pendingCollectionSubmissions) {
    if (!sub.specialCollectionId) continue;
    const key = `${sub.unitNumber}:${sub.specialCollectionId}`;
    pendingCollectionMap.set(key, (pendingCollectionMap.get(key) ?? 0) + sub.amountSen);
  }

  // Always sort by unit number
  const rows = [...unsortedRows].sort((a, b) => {
    const unitA = parseInt(a.unitNumber, 10);
    const unitB = parseInt(b.unitNumber, 10);
    return unitA - unitB;
  });

  const filteredRows = query
    ? rows.filter(
        (row) =>
          row.unitNumber.toLowerCase().includes(query.toLowerCase()) ||
          row.name.toLowerCase().includes(query.toLowerCase()),
      )
    : rows;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const hasExtra = filteredRows.some((r) => r.extraDueSen > 0);
  const extraCols = specialCollections.length > 0 ? specialCollections.length : hasExtra ? 1 : 0;

  const exportQuery = new URLSearchParams({
    year: String(selectedYear),
    ...(includeInactive ? { includeInactive: "on" } : {}),
  }).toString();

  const paidAll = filteredRows.filter(
    (r) =>
      r.status === "ACTIVE" &&
      r.months
        .slice(0, currentYear === selectedYear ? currentMonth : 12)
        .every((m) => (m ?? 0) >= DEFAULT_MONTHLY_FEE_SEN),
  ).length;
  const hasArrears = filteredRows.filter(
    (r) =>
      r.status === "ACTIVE" &&
      r.months
        .slice(0, currentYear === selectedYear ? currentMonth : 12)
        .some((m) => (m ?? 0) < DEFAULT_MONTHLY_FEE_SEN),
  ).length;
  const forSaleCount = filteredRows.filter((r) => r.isForSale).length;

  const holdLabel = (status: string, override: string | null | undefined) => {
    const s = override === "FOR_SALE" || override === "MOVED_OUT" ? override : status;
    return s === "FOR_SALE" ? "FOR SALE" : s === "MOVED_OUT" ? "MOVED OUT" : s === "EXEMPT" ? "EXEMPT" : "";
  };

  const legend: { state: MonthState; label: string }[] = [
    { state: "paid", label: t.reports.paid },
    { state: "partial", label: t.reports.partialPayment },
    { state: "unpaid", label: t.reports.unpaidPast },
    { state: "hold", label: t.reports.forSaleVacant },
    { state: "pending", label: "Pending review" },
  ];

  const stats = [
    { label: t.reports.totalUnits, value: filteredRows.length, tone: "text-[var(--ink)]" },
    { label: t.reports.fullyPaid, value: paidAll, tone: "text-[#1c7a33]" },
    { label: t.reports.haveArrears, value: hasArrears, tone: "text-[#c2341a]" },
    { label: t.reports.forSale, value: forSaleCount, tone: "text-[#5d6779]" },
  ];

  return (
    <AdminPage>
      <PageHeader
        title={`${t.reports.heading} — ${selectedYear}`}
        subtitle={t.reports.title}
        actions={
          <>
            <a className="ui-button-secondary" href={`/reports/yearly.xlsx?${exportQuery}`}>
              <FileSpreadsheet size={15} />
              {t.reports.excel}
            </a>
            <a className="ui-button-secondary" href={`/reports/yearly.pdf?${exportQuery}`}>
              <FileText size={15} />
              {t.reports.pdf}
            </a>
            {/* Upload (file comparison) is on hold (KIV); route redirects to /reports. */}
          </>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div className="ui-card p-4" key={s.label}>
            <p className="text-sm text-[var(--ink-2)]">{s.label}</p>
            <p className={`mt-1 font-heading text-3xl font-bold tracking-tight tabular-nums ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="ui-card overflow-hidden">
        {/* Filter bar */}
        <form className="ui-toolbar" method="get">
          <label className="ui-search">
            <Search size={16} className="text-[var(--ink-2)]" />
            <input aria-label="Search" defaultValue={query} name="q" placeholder="Search unit or name" type="search" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--ink-2)]">
            {t.common.year}
            <input className="ui-input w-24" defaultValue={selectedYear} max={2100} min={2020} name="year" type="number" />
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <input defaultChecked={includeInactive} name="includeInactive" type="checkbox" />
            {t.reports.includeInactive}
          </label>
          <button className="ui-button-primary" type="submit">
            {t.common.apply}
          </button>
        </form>

        {/* Legend — above table */}
        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
          {legend.map((l) => (
            <StatusPill key={l.state} state={l.state} label={l.label} />
          ))}
          {extraCols > 0 && (
            <span className={`ui-chip ${stateStyles.partial.pill}`}>{t.reports.specialCollectionLegend}</span>
          )}
        </div>

        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#fafafc] text-[var(--ink-2)]">
                <th className="border-b border-black/5 bg-[#fafafc] px-3 py-3 text-center font-semibold">No</th>
                <th className="sticky left-0 z-10 border-b border-black/5 bg-[#fafafc] px-3 py-3 font-semibold">NO RUMAH</th>
                <th className="min-w-36 border-b border-black/5 px-3 py-3 font-semibold">NAMA</th>
                {MONTH_LABELS.map((label, i) => (
                  <th
                    className={`border-b border-black/5 px-1.5 py-3 text-center font-semibold ${
                      selectedYear === currentYear && i + 1 === currentMonth ? "text-[var(--blue)]" : ""
                    }`}
                    key={label}
                  >
                    {label}
                    <span className="block text-[10px] font-normal opacity-70">{String(selectedYear).slice(2)}</span>
                  </th>
                ))}
                {specialCollections.map((sc) => (
                  <th className="border-b border-black/5 px-2 py-3 text-center font-semibold text-[#8a6300]" key={sc.id}>
                    {sc.title.toUpperCase()}
                  </th>
                ))}
                {hasExtra && specialCollections.length === 0 && (
                  <th className="border-b border-black/5 px-2 py-3 text-center font-semibold text-[#8a6300]">EXTRA</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className="group" key={row.unitNumber}>
                  <td className={`${CELL} px-3 text-[var(--ink-2)]`}>{row.no}</td>
                  <td className={`${STICKY_CELL} px-3 py-2 font-heading font-bold text-[var(--ink)]`}>{row.unitNumber}</td>
                  <td className="min-w-36 border-b border-black/5 px-3 py-2 font-medium text-[var(--ink)] group-hover:bg-[#fafafc]">
                    {row.name}
                  </td>
                  {row.isForSale ? (
                    Array.from({ length: 12 + extraCols }).map((_, i) => (
                      <td className={CELL} key={i}>
                        <span className={`${TILE} ${stateStyles.hold.tile}`}>{holdLabel(row.status, null)}</span>
                      </td>
                    ))
                  ) : (
                    <>
                      {row.months.map((amountSen, i) => {
                        const pending = pendingMap.get(`${row.unitNumber}:${selectedYear}:${i + 1}`);
                        const isFuture = selectedYear > currentYear || (selectedYear === currentYear && i + 1 > currentMonth);
                        const state = monthState({
                          amountSen,
                          override: row.monthStatusOverrides[i],
                          residentStatus: row.status,
                          isFuture,
                          pending: Boolean(pending),
                        });

                        return (
                          <td className={CELL} key={i}>
                            <span
                              className={`${TILE} ${stateStyles[state].tile}`}
                              title={amountSen ? fmtCell(amountSen) : undefined}
                            >
                              {pending ? (
                                <span className="grid leading-tight">
                                  <span>{fmtCell(pending.appliedSen)}</span>
                                  <span className="text-[10px]">{pending.isCarryForward ? "CARRY" : "PENDING"}</span>
                                </span>
                              ) : state === "hold" ? (
                                holdLabel(row.status, row.monthStatusOverrides[i])
                              ) : state === "paid" || state === "ahead" ? (
                                "✓"
                              ) : amountSen ? (
                                fmtCell(amountSen)
                              ) : (
                                ""
                              )}
                            </span>
                          </td>
                        );
                      })}
                      {specialCollections.length > 0
                        ? specialCollections.map((sc) => {
                            const assignment = row.assignments.find((a) => a.specialCollectionId === sc.id);
                            const pendingAmountSen = pendingCollectionMap.get(`${row.unitNumber}:${sc.id}`) ?? 0;
                            const state: MonthState | null = pendingAmountSen
                              ? "pending"
                              : !assignment
                                ? null
                                : assignment.outstanding > 0
                                  ? "partial"
                                  : "paid";
                            return (
                              <td className={CELL} key={sc.id}>
                                {state ? (
                                  <span className={`${TILE} ${stateStyles[state].tile}`}>
                                    {pendingAmountSen ? (
                                      <span className="grid leading-tight">
                                        <span>{fmtCell(pendingAmountSen)}</span>
                                        <span className="text-[10px]">PENDING</span>
                                      </span>
                                    ) : assignment && assignment.outstanding > 0 ? (
                                      fmtCell(assignment.outstanding)
                                    ) : (
                                      "✓"
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-[#c7c7cc]">{"—"}</span>
                                )}
                              </td>
                            );
                          })
                        : hasExtra && (
                            <td className={CELL}>
                              {row.extraOutstandingSen > 0 ? (
                                <span className={`${TILE} ${stateStyles.partial.tile}`}>{fmtCell(row.extraOutstandingSen)}</span>
                              ) : row.extraDueSen > 0 ? (
                                <span className={`${TILE} ${stateStyles.paid.tile}`}>{"✓"}</span>
                              ) : (
                                <span className="text-[#c7c7cc]">{"—"}</span>
                              )}
                            </td>
                          )}
                    </>
                  )}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={15 + extraCols}>
                    <div className="ui-empty">{t.reports.noResidents}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPage>
  );
}
