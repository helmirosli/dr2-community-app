import Link from "next/link";
import { ChevronRight, FileSpreadsheet, FileText, Upload } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { clampReportYear } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { prisma } from "@/lib/prisma";

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

type PendingSubmission = {
  unitNumber: string;
  amountSen: number;
  coverageStartYear: number;
  coverageStartMonth: number;
  coverageEndYear: number;
  coverageEndMonth: number;
};

type PendingMonthInfo = {
  appliedSen: number;
  isCarryForward: boolean;
  totalPending: number;
};

function fmtCell(amountSen: number) {
  return `RM${(amountSen / 100).toFixed(2)}`;
}

function getPendingSubmissionsMap(submissions: PendingSubmission[]): Map<string, PendingMonthInfo> {
  const map = new Map<string, PendingMonthInfo>();
  const DEFAULT_MONTHLY_FEE_SEN = 5000; // RM50

  for (const sub of submissions) {
    let remainingAmountSen = sub.amountSen;
    let currentYear = sub.coverageStartYear;
    let currentMonth = sub.coverageStartMonth;
    let isFirstMonth = true;

    // Distribute amount across months with automatic carry-forward
    while (remainingAmountSen > 0 && currentYear <= sub.coverageEndYear + 1) {
      const appliedSen = Math.min(DEFAULT_MONTHLY_FEE_SEN, remainingAmountSen);
      const key = `${sub.unitNumber}:${currentYear}:${currentMonth}`;

      map.set(key, {
        appliedSen,
        isCarryForward: !isFirstMonth,
        totalPending: sub.amountSen,
      });

      remainingAmountSen -= appliedSen;
      isFirstMonth = false;

      currentMonth += 1;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }

      // Stop if we've gone way beyond the intended coverage period
      if (currentYear > sub.coverageEndYear + 2) break;
    }
  }

  return map;
}

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

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Reporting</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.reports.heading}</span>
        </nav>

        {/* Compact header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{t.reports.title}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {t.reports.heading} — {selectedYear}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="ui-button-secondary" href={`/reports/yearly.xlsx?${exportQuery}`}>
              <FileSpreadsheet size={15} />
              {t.reports.excel}
            </a>
            <a className="ui-button-secondary" href={`/reports/yearly.pdf?${exportQuery}`}>
              <FileText size={15} />
              {t.reports.pdf}
            </a>
            <Link className="ui-button-secondary" href="/reports/file-upload">
              <Upload size={15} />
              {t.reports.upload}
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="ui-card p-4">
            <p className="text-xs text-slate-500">{t.reports.totalUnits}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{filteredRows.length}</p>
          </div>
          <div className="ui-card p-4">
            <p className="text-xs text-slate-500">{t.reports.fullyPaid}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{paidAll}</p>
          </div>
          <div className="ui-card p-4">
            <p className="text-xs text-slate-500">{t.reports.haveArrears}</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{hasArrears}</p>
          </div>
          <div className="ui-card p-4">
            <p className="text-xs text-slate-500">{t.reports.forSale}</p>
            <p className="mt-1 text-2xl font-bold text-slate-500">{forSaleCount}</p>
          </div>
        </div>

        <section className="ui-card overflow-hidden">
          {/* Filter bar */}
          <form className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4" method="get">
            <label className="ui-label">
              {t.common.year}
              <input className="ui-input w-24" defaultValue={selectedYear} max={2100} min={2020} name="year" type="number" />
            </label>
            <label className="ui-label flex-1">
              Search
              <input className="ui-input" defaultValue={query} name="q" placeholder="Search unit or name" type="search" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
              <input defaultChecked={includeInactive} name="includeInactive" type="checkbox" />
              {t.reports.includeInactive}
            </label>
            <button className="ui-button-primary self-end" type="submit">
              {t.common.apply}
            </button>
          </form>

          {/* Legend — above table */}
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-white ring-1 ring-slate-200" />{t.reports.paid}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-amber-50 ring-1 ring-amber-200" />{t.reports.partialPayment}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-red-50 ring-1 ring-red-100" />{t.reports.unpaidPast}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-slate-100" />{t.reports.forSaleVacant}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-blue-50 ring-1 ring-blue-200" />Pending review</span>
            {(hasExtra || specialCollections.length > 0) && (
              <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-amber-50 ring-1 ring-amber-200" />{t.reports.specialCollectionLegend}</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs" style={{ minWidth: `${16 + (hasExtra ? 1 : 0)}rem` }}>
              <thead>
                <tr className="bg-cyan-800 text-white">
                  <th className="sticky left-0 top-0 z-10 bg-cyan-800 px-3 py-3 text-center font-semibold">No</th>
                  <th className="sticky left-8 top-0 z-10 bg-cyan-800 px-3 py-3 font-semibold">NO RUMAH</th>
                  <th className="sticky left-24 top-0 z-10 min-w-32 bg-cyan-800 px-3 py-3 font-semibold">NAMA</th>
                  {MONTH_LABELS.map((label, i) => (
                    <th
                      className={`sticky top-0 px-2 py-3 text-center font-semibold text-white ${
                        selectedYear === currentYear && i + 1 === currentMonth ? "bg-cyan-600" : "bg-cyan-800"
                      }`}
                      key={label}
                    >
                      {label}
                      <span className="block text-xs font-normal opacity-75">{String(selectedYear).slice(2)}</span>
                    </th>
                  ))}
                  {specialCollections.length > 0 &&
                    specialCollections.map((sc) => (
                      <th className="bg-amber-600 px-2 py-3 text-center font-semibold text-white" key={sc.id}>
                        {sc.title.toUpperCase()}
                      </th>
                    ))}
                  {hasExtra && specialCollections.length === 0 && (
                    <th className="bg-amber-600 px-2 py-3 text-center font-semibold text-white">EXTRA</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rowIdx) => {
                  const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                  return (
                    <tr className={`${rowBg} hover:bg-cyan-50/40`} key={row.unitNumber}>
                      <td className={`sticky left-0 z-10 ${rowBg} border-b border-slate-100 px-3 py-2.5 text-center font-medium text-slate-500`}>
                        {row.no}
                      </td>
                      <td className={`sticky left-8 z-10 ${rowBg} border-b border-slate-100 px-3 py-2.5 font-semibold text-slate-800`}>
                        {row.unitNumber}
                      </td>
                      <td className={`sticky left-24 z-10 min-w-32 ${rowBg} border-b border-slate-100 px-3 py-2.5 font-medium text-slate-900`}>
                        {row.name}
                      </td>
                      {row.isForSale ? (
                        Array.from({ length: 12 + (specialCollections.length > 0 ? specialCollections.length : hasExtra ? 1 : 0) }).map((_, i) => (
                          <td className="border-b border-slate-100 bg-slate-100 px-2 py-2.5 text-center italic text-xs font-medium text-slate-400" key={i}>
                            {row.status === "FOR_SALE" ? "FOR SALE" : row.status === "MOVED_OUT" ? "MOVED OUT" : "EXEMPT"}
                          </td>
                        ))
                      ) : (
                        <>
                          {row.months.map((amountSen, i) => {
                            const monthOverride = row.monthStatusOverrides[i];
                            const isFuture = selectedYear > currentYear || (selectedYear === currentYear && i + 1 > currentMonth);
                            const isPaid = (amountSen ?? 0) >= DEFAULT_MONTHLY_FEE_SEN;
                            const isPartial = !isPaid && (amountSen ?? 0) > 0;
                            const isUnpaidPast = !isPaid && !isPartial && !isFuture;
                            const isExemptUnpaid = row.status === "EXEMPT" && amountSen === null;
                            const isStatusOverride = monthOverride === "FOR_SALE" || monthOverride === "MOVED_OUT";

                            const pendingKey = `${row.unitNumber}:${selectedYear}:${i + 1}`;
                            const pendingSubmission = pendingMap.get(pendingKey);

                            let cellClass = "border-b border-slate-100 px-2 py-2.5 text-center text-xs font-medium relative";
                            let content: React.ReactNode = "";

                            if (pendingSubmission) {
                              cellClass += " bg-blue-50 text-blue-700 border-l-4 border-l-blue-500";
                              content = (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span>{fmtCell(pendingSubmission.appliedSen)}</span>
                                  <span className="text-xs text-blue-600 font-semibold">
                                    {pendingSubmission.isCarryForward ? "CARRY" : "PENDING"}
                                  </span>
                                </div>
                              );
                            } else if (isPartial) {
                              cellClass += " bg-amber-50 text-amber-800";
                              content = fmtCell(amountSen ?? 0);
                            } else if (isUnpaidPast) {
                              cellClass += " bg-red-50";
                              content = "";
                            } else if (isStatusOverride) {
                              cellClass += " bg-slate-100 italic text-slate-500";
                              content =
                                monthOverride === "FOR_SALE"
                                  ? "FOR SALE"
                                  : monthOverride === "MOVED_OUT"
                                    ? "MOVED OUT"
                                    : "";
                            } else if (isExemptUnpaid) {
                              cellClass += " bg-slate-100 italic text-slate-500";
                              content = "EXEMPT";
                            } else if (isPaid) {
                              cellClass += " text-slate-800";
                              content = fmtCell(amountSen ?? 0);
                            } else {
                              cellClass += " text-slate-400";
                              content = "";
                            }

                            return (
                              <td className={cellClass} key={i}>
                                {content}
                              </td>
                            );
                          })}
                          {specialCollections.length > 0
                            ? specialCollections.map((sc) => {
                                const assignment = row.assignments.find((a) => a.specialCollectionId === sc.id);
                                const pendingKey = `${row.unitNumber}:${sc.id}`;
                                const pendingAmountSen = pendingCollectionMap.get(pendingKey) ?? 0;

                                if (!assignment && !pendingAmountSen) {
                                  // Resident not assigned to this collection
                                  return (
                                    <td className="border-b border-slate-100 px-2 py-2.5 text-center text-xs font-medium" key={sc.id}>
                                      <span className="text-slate-300">{"\u2014"}</span>
                                    </td>
                                  );
                                }

                                const outstanding = assignment ? assignment.outstanding : 0;
                                return (
                                  <td className={`border-b border-slate-100 px-2 py-2.5 text-center text-xs font-medium ${pendingAmountSen > 0 ? "bg-blue-50 border-l-4 border-l-blue-500" : "bg-amber-50"}`} key={sc.id}>
                                    {outstanding > 0 && !pendingAmountSen && (
                                      <div className="font-semibold text-amber-700">RM{(outstanding / 100).toFixed(2)}</div>
                                    )}
                                    {outstanding === 0 && assignment && !pendingAmountSen && (
                                      <span className="text-emerald-600">{"\u2713"}</span>
                                    )}
                                    {pendingAmountSen > 0 && (
                                      <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                        <span className="text-blue-700">RM{(pendingAmountSen / 100).toFixed(2)}</span>
                                        <span className="text-xs font-semibold text-blue-600">PENDING</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })
                            : hasExtra && (
                                <td className="border-b border-slate-100 bg-amber-50 px-2 py-2.5 text-center text-xs font-medium">
                                  {row.extraOutstandingSen > 0 ? (
                                    <span className="font-semibold text-amber-700">
                                      RM{(row.extraOutstandingSen / 100).toFixed(2)}
                                    </span>
                                  ) : row.extraDueSen > 0 ? (
                                    <span className="text-emerald-600">{"\u2713"}</span>
                                  ) : (
                                    <span className="text-slate-300">{"\u2014"}</span>
                                  )}
                                </td>
                              )}
                        </>
                      )}
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={16}>
                      {t.reports.noResidents}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>
      </div>
    </main>
  );
}
