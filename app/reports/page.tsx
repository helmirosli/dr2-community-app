import Link from "next/link";
import { FileSpreadsheet, FileText, Home, LayoutList, Upload } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { clampReportYear } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ReportsPageProps = {
  searchParams: Promise<{
    year?: string;
    includeInactive?: string;
  }>;
};

function fmtCell(amountSen: number) {
  return `RM${(amountSen / 100).toFixed(2)}`;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const t = await getDictionary();

  const now = new Date();
  const selectedYear = clampReportYear(params.year, now.getFullYear());
  const includeInactive = params.includeInactive !== "off";

  const { rows: unsortedRows, specialCollections } = await getYearGridData({
    year: selectedYear,
    includeInactive,
  });

  // Always sort by unit number
  const rows = [...unsortedRows].sort((a, b) => {
    const unitA = parseInt(a.unitNumber, 10);
    const unitB = parseInt(b.unitNumber, 10);
    return unitA - unitB;
  });

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const hasExtra = rows.some((r) => r.extraDueSen > 0);

  const exportQuery = new URLSearchParams({
    year: String(selectedYear),
    ...(includeInactive ? { includeInactive: "on" } : {}),
  }).toString();

  const paidAll = rows.filter(
    (r) => !r.isForSale && r.months.slice(0, currentYear === selectedYear ? currentMonth : 12).every((m) => (m ?? 0) >= DEFAULT_MONTHLY_FEE_SEN),
  ).length;
  const hasArrears = rows.filter(
    (r) => !r.isForSale && r.months.slice(0, currentYear === selectedYear ? currentMonth : 12).some((m) => (m ?? 0) < DEFAULT_MONTHLY_FEE_SEN),
  ).length;
  const forSaleCount = rows.filter((r) => r.isForSale).length;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <header className="flex flex-col gap-4 sm:gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">{t.reports.title}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t.reports.heading} — {selectedYear}
            </h1>
            <p className="mt-3 text-base text-slate-600">
              {t.reports.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              href={`/reports/yearly.xlsx?${exportQuery}`}
            >
              <FileSpreadsheet size={17} />
              {t.reports.excel}
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              href={`/reports/yearly.pdf?${exportQuery}`}
            >
              <FileText size={17} />
              {t.reports.pdf}
            </a>
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              href="/reports/file-upload"
            >
              <Upload size={17} />
              {t.reports.upload}
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <form className="flex flex-wrap items-end gap-4 border-b border-slate-100 px-6 py-4" method="get">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t.common.year}
              <input
                className="w-28 rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                defaultValue={selectedYear}
                max={2100}
                min={2020}
                name="year"
                type="number"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input defaultChecked={includeInactive} name="includeInactive" type="checkbox" />
              {t.reports.includeInactive}
            </label>
            <button className="min-h-10 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60" type="submit">
              {t.common.apply}
            </button>
            <div className="ml-auto flex flex-wrap gap-4 text-sm text-slate-600">
              <span><span className="font-semibold text-slate-900">{rows.length}</span> {t.reports.totalUnits}</span>
              <span><span className="font-semibold text-emerald-700">{paidAll}</span> {t.reports.fullyPaid}</span>
              <span><span className="font-semibold text-red-600">{hasArrears}</span> {t.reports.haveArrears}</span>
              {forSaleCount > 0 && <span><span className="font-semibold text-slate-500">{forSaleCount}</span> {t.reports.forSale}</span>}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs" style={{ minWidth: `${16 + (hasExtra ? 1 : 0) * 72 + (specialCollections.length > 0 ? 72 : 0)}rem` }}>
              <thead>
                <tr className="bg-cyan-800 text-white">
                  <th className="sticky left-0 z-10 bg-cyan-800 px-3 py-2.5 text-center font-semibold">No</th>
                  <th className="sticky left-8 z-10 bg-cyan-800 px-3 py-2.5 font-semibold">NO RUMAH</th>
                  <th className="sticky left-24 z-10 min-w-32 bg-cyan-800 px-3 py-2.5 font-semibold">NAMA</th>
                  {MONTH_LABELS.map((label, i) => (
                    <th
                      className={`px-2 py-2.5 text-center font-semibold ${
                        selectedYear === currentYear && i + 1 === currentMonth ? "bg-cyan-600" : ""
                      }`}
                      key={label}
                    >
                      {label}
                      <span className="block font-normal opacity-75">{String(selectedYear).slice(2)}</span>
                    </th>
                  ))}
                  {specialCollections.length > 0 &&
                    specialCollections.map((sc) => (
                      <th className="bg-amber-600 px-2 py-2.5 text-center font-semibold" key={sc.id}>
                        {sc.title.toUpperCase()}
                      </th>
                    ))}
                  {hasExtra && specialCollections.length === 0 && (
                    <th className="bg-amber-600 px-2 py-2.5 text-center font-semibold">EXTRA</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => {
                  const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                  return (
                    <tr className={`${rowBg} transition-colors duration-150 hover:bg-slate-50/60`} key={row.unitNumber}>
                      <td className={`sticky left-0 z-10 ${rowBg} border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-500`}>
                        {row.no}
                      </td>
                      <td className={`sticky left-8 z-10 ${rowBg} border-b border-slate-100 px-3 py-2 font-semibold text-slate-800`}>
                        {row.unitNumber}
                      </td>
                      <td className={`sticky left-24 z-10 min-w-32 ${rowBg} border-b border-slate-100 px-3 py-2 font-medium text-slate-900`}>
                        {row.name}
                      </td>
                      {row.isForSale ? (
                        Array.from({ length: 12 + (specialCollections.length > 0 ? specialCollections.length : hasExtra ? 1 : 0) }).map((_, i) => (
                          <td className="border-b border-slate-100 bg-slate-100 px-2 py-2 text-center italic text-slate-400" key={i}>
                            {row.status === "FOR_SALE" ? "FOR SALE" : row.status === "MOVED_OUT" ? "MOVED OUT" : "EXEMPT"}
                          </td>
                        ))
                      ) : (
                        <>
                          {row.months.map((amountSen, i) => {
                            const isFuture = selectedYear > currentYear || (selectedYear === currentYear && i + 1 > currentMonth);
                            const isPaid = (amountSen ?? 0) >= DEFAULT_MONTHLY_FEE_SEN;
                            const isPartial = !isPaid && (amountSen ?? 0) > 0;
                            const isUnpaidPast = !isPaid && !isPartial && !isFuture;

                            let cellClass = "border-b border-slate-100 px-2 py-2 text-center text-slate-800";
                            if (isPartial) cellClass += " bg-amber-50 text-amber-800";
                            else if (isUnpaidPast) cellClass += " bg-red-50";
                            else if (isFuture && amountSen === null) cellClass += " text-slate-300";

                            return (
                              <td className={cellClass} key={i}>
                                {amountSen !== null ? fmtCell(amountSen) : (isFuture ? "" : "")}
                              </td>
                            );
                          })}
                          {specialCollections.length > 0
                            ? specialCollections.map((sc) => (
                                <td className="border-b border-slate-100 bg-amber-50 px-2 py-2 text-center" key={sc.id}>
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
                              ))
                            : hasExtra && (
                                <td className="border-b border-slate-100 bg-amber-50 px-2 py-2 text-center">
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
                {rows.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={16}>
                      {t.reports.noResidents}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-white ring-1 ring-slate-200" />{t.reports.paid}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-amber-50 ring-1 ring-amber-200" />{t.reports.partialPayment}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-red-50 ring-1 ring-red-100" />{t.reports.unpaidPast}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-slate-100" />{t.reports.forSaleVacant}</span>
            {(hasExtra || specialCollections.length > 0) && (
              <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-amber-50 ring-1 ring-amber-200" />{t.reports.specialCollectionLegend}</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
