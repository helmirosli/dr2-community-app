import Link from "next/link";
import { Send, ShieldAlert } from "lucide-react";

import { DEFAULT_MONTHLY_FEE_SEN } from "@/lib/money";
import { clampReportYear } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type StatusPageProps = {
  searchParams: Promise<{ year?: string }>;
};

function fmtCell(amountSen: number) {
  return `RM${(amountSen / 100).toFixed(2)}`;
}

export default async function StatusPage({ searchParams }: StatusPageProps) {
  const params = await searchParams;

  const now = new Date();
  const selectedYear = clampReportYear(params.year, now.getFullYear());
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { rows, specialCollections } = await getYearGridData({
    year: selectedYear,
    includeInactive: true,
  });

  const hasExtra = specialCollections.length > 0 || rows.some((r) => r.extraDueSen > 0);

  return (
    <div className="grid gap-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Payment Status</h1>
          <p className="mt-3 text-base text-slate-600">
            View the payment status for all units in {selectedYear}. Marked payments are verified by the AJK team.
          </p>
        </div>
        <Link
          href="/submit"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <Send size={18} />
          <span>Submit Payment</span>
        </Link>
      </div>

      {/* Year selector */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4" method="get">
          <label className="grid gap-2 sm:flex sm:items-end sm:gap-3">
            <span className="text-sm font-medium text-slate-700">View year:</span>
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:w-32"
              defaultValue={selectedYear}
              max={2100}
              min={2020}
              name="year"
              type="number"
            />
          </label>
          <button
            className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            type="submit"
          >
            Update
          </button>
        </form>
      </div>

      {/* Status table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs" style={{ minWidth: `${16 + (hasExtra ? 1 : 0)}rem` }}>
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <th className="sticky left-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-3 text-center font-semibold">No</th>
                <th className="sticky left-8 z-10 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-3 font-semibold">Unit</th>
                <th className="sticky left-28 z-10 min-w-32 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-3 font-semibold">Name</th>
                {MONTH_LABELS.map((label, i) => (
                  <th
                    className={`px-2 py-3 text-center font-semibold ${
                      selectedYear === currentYear && i + 1 === currentMonth
                        ? "bg-cyan-600 text-white"
                        : "text-slate-700"
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
                  <th className="bg-amber-600 px-2 py-3 text-center font-semibold text-white">Extra</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                return (
                  <tr className={rowBg} key={row.unitNumber}>
                    <td className={`sticky left-0 z-10 ${rowBg} border-b border-slate-100 px-3 py-2.5 text-center font-medium text-slate-400`}>
                      {row.no}
                    </td>
                    <td className={`sticky left-8 z-10 ${rowBg} border-b border-slate-100 px-3 py-2.5 font-semibold text-slate-800`}>
                      {row.unitNumber}
                    </td>
                    <td className={`sticky left-28 z-10 min-w-32 ${rowBg} border-b border-slate-100 px-3 py-2.5 font-medium text-slate-900`}>
                      {row.name}
                    </td>
                    {row.isForSale ? (
                      Array.from({
                        length: 12 + (hasExtra ? specialCollections.length > 0 ? specialCollections.length : 1 : 0),
                      }).map((_, i) => (
                        <td className="border-b border-slate-100 bg-slate-100 px-2 py-2.5 text-center italic text-xs font-medium text-slate-400" key={i}>
                          {row.status === "FOR_SALE" ? "FOR SALE" : row.status === "MOVED_OUT" ? "MOVED OUT" : "EXEMPT"}
                        </td>
                      ))
                    ) : (
                      <>
                        {row.months.map((amountSen, i) => {
                          const isFuture =
                            selectedYear > currentYear ||
                            (selectedYear === currentYear && i + 1 > currentMonth);
                          const isPaid = (amountSen ?? 0) >= DEFAULT_MONTHLY_FEE_SEN;
                          const isPartial = !isPaid && (amountSen ?? 0) > 0;
                          const isUnpaidPast = !isPaid && !isPartial && !isFuture;

                          let cellClass = "border-b border-slate-100 px-2 py-2.5 text-center text-xs font-medium";
                          if (isPartial) cellClass += " bg-amber-50 text-amber-700";
                          else if (isUnpaidPast) cellClass += " bg-red-50 text-red-600";
                          else cellClass += " text-slate-600";

                          return (
                            <td className={cellClass} key={i}>
                              {amountSen !== null ? fmtCell(amountSen) : ""}
                            </td>
                          );
                        })}
                        {specialCollections.length > 0
                          ? specialCollections.map((sc) => (
                              <td className="border-b border-slate-100 bg-amber-50 px-2 py-2.5 text-center text-xs font-medium" key={sc.id}>
                                {row.extraOutstandingSen > 0 ? (
                                  <span className="text-amber-700">
                                    RM{(row.extraOutstandingSen / 100).toFixed(2)}
                                  </span>
                                ) : row.extraDueSen > 0 ? (
                                  <span className="text-emerald-600">✓</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            ))
                          : hasExtra && (
                              <td className="border-b border-slate-100 bg-amber-50 px-2 py-2.5 text-center text-xs font-medium">
                                {row.extraOutstandingSen > 0 ? (
                                  <span className="text-amber-700">
                                    RM{(row.extraOutstandingSen / 100).toFixed(2)}
                                  </span>
                                ) : row.extraDueSen > 0 ? (
                                  <span className="text-emerald-600">✓</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
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
                  <td className="border-b border-slate-100 px-5 py-10 text-center text-slate-500" colSpan={16}>
                    No resident records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend and info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="font-semibold text-slate-900">Payment Status Legend</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-block size-3 rounded-sm bg-white ring-1 ring-slate-300" />
              <span className="text-sm text-slate-600">Paid (RM50.00 or more)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block size-3 rounded-sm bg-amber-50 ring-1 ring-amber-300" />
              <span className="text-sm text-slate-600">Partial payment</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block size-3 rounded-sm bg-red-50 ring-1 ring-red-300" />
              <span className="text-sm text-slate-600">Unpaid (past month)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block size-3 rounded-sm bg-slate-100" />
              <span className="text-sm text-slate-600">Not applicable (FOR SALE / Exempt)</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="shrink-0 text-cyan-600" size={20} />
            <div>
              <h3 className="font-semibold text-cyan-900">Privacy Protection</h3>
              <p className="mt-2 text-sm text-cyan-800">
                This report shows payment status only. Bank details, phone numbers, and payment proof files are not displayed here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
