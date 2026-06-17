import Link from "next/link";
import { FileSpreadsheet, FileText, Home, TableProperties } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { clampReportMonth, clampReportYear, getMonthlyReport } from "@/lib/reports/monthly-data";
import { type SelectedMonthStatus } from "@/lib/reports/monthly";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type Props = {
  searchParams: Promise<{ year?: string; month?: string; includeInactive?: string }>;
};

const statusBadge: Record<SelectedMonthStatus, { label: string; className: string }> = {
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  UPFRONT: { label: "Paid (upfront)", className: "bg-sky-50 text-sky-700 ring-sky-100" },
  PARTIAL: { label: "Partial", className: "bg-amber-50 text-amber-700 ring-amber-100" },
  UNPAID: { label: "Unpaid", className: "bg-red-50 text-red-700 ring-red-100" },
};

export default async function MonthlyDetailPage({ searchParams }: Props) {
  await requireDashboardUser();
  const params = await searchParams;

  const now = new Date();
  const selectedYear = clampReportYear(params.year, now.getFullYear());
  const selectedMonth = clampReportMonth(params.month, now.getMonth() + 1);
  const includeInactive = params.includeInactive === "on";

  const { rows, summary } = await getMonthlyReport({ year: selectedYear, month: selectedMonth, includeInactive });

  const exportQuery = new URLSearchParams({
    year: String(selectedYear),
    month: String(selectedMonth),
    ...(includeInactive ? { includeInactive: "on" } : {}),
  }).toString();

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Monthly detail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {monthLabel(selectedYear, selectedMonth)} — outstanding detail
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50" href="/dashboard">
              <Home aria-hidden="true" size={17} />
              Dashboard
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50" href="/reports">
              <TableProperties aria-hidden="true" size={17} />
              Year grid
            </Link>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50" href={`/reports/monthly.xlsx?${exportQuery}`}>
              <FileSpreadsheet aria-hidden="true" size={17} />
              Excel
            </a>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-red-200 hover:bg-red-50" href={`/reports/monthly.pdf?${exportQuery}`}>
              <FileText aria-hidden="true" size={17} />
              PDF
            </a>
          </div>
        </header>

        <section className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
          <form className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-end" method="get">
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:w-44">
              Month
              <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue={selectedMonth} name="month">
                {months.map((m) => (
                  <option key={m} value={m}>{monthLabel(selectedYear, m)}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:w-36">
              Year
              <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={selectedYear} max={2100} min={2020} name="year" type="number" />
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700 md:flex-1">
              <input defaultChecked={includeInactive} name="includeInactive" type="checkbox" />
              Include inactive / moved-out
            </label>
            <button className="min-h-10 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" type="submit">Apply</button>
          </form>

          <div className="grid gap-4 border-b border-slate-100 p-5 md:grid-cols-4">
            {[
              { label: "Residents", value: summary.residentCount },
              { label: "Paid", value: summary.paidCount + summary.upfrontCount, helper: `${summary.upfrontCount} upfront` },
              { label: "Unpaid / partial", value: summary.unpaidCount + summary.partialCount },
              { label: "Outstanding", value: formatRM(summary.outstandingAmountSen) },
            ].map((card) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 p-4" key={card.label}>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
                {"helper" in card && <p className="mt-1 text-xs text-slate-500">{card.helper}</p>}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 font-semibold">Resident</th>
                  <th className="px-5 py-3 font-semibold">Paid until</th>
                  <th className="px-5 py-3 font-semibold">{monthLabel(selectedYear, selectedMonth)}</th>
                  <th className="px-5 py-3 font-semibold">Outstanding</th>
                  <th className="px-5 py-3 font-semibold">Extra</th>
                  <th className="px-5 py-3 font-semibold">Last payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length > 0 ? rows.map((row) => {
                  const badge = statusBadge[row.selectedStatus];
                  return (
                    <tr className="transition hover:bg-cyan-50/40" key={row.residentId}>
                      <td className="px-5 py-4 font-semibold text-slate-950">{row.unitNumber}</td>
                      <td className="px-5 py-4">
                        <Link className="font-medium text-cyan-700 hover:text-cyan-900" href={`/residents/${row.residentId}`}>{row.name}</Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.paidUntilYear && row.paidUntilMonth ? monthLabel(row.paidUntilYear, row.paidUntilMonth) : "Not paid yet"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.outstandingMonths > 0 ? (
                          <span>
                            <span className="font-semibold text-slate-950">{formatRM(row.outstandingAmountSen)}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">{row.outstandingMonths}m</span>
                          </span>
                        ) : <span className="text-emerald-700">Up to date</span>}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {row.extraDueSen > 0 ? (
                          row.extraOutstandingSen > 0 ? <span className="font-semibold text-amber-700">{formatRM(row.extraOutstandingSen)}</span> : <span className="text-emerald-700">Cleared</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{row.lastPaymentDate ? row.lastPaymentDate.toLocaleDateString("en-MY") : "—"}</td>
                    </tr>
                  );
                }) : (
                  <tr><td className="px-5 py-10 text-center text-slate-500" colSpan={7}>No residents match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
