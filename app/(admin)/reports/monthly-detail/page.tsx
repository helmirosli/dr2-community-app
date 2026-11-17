import Link from "next/link";
import { FileSpreadsheet, FileText, Home } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";
import { StatusPill } from "@/app/components/status";
import type { MonthState } from "@/lib/status";

import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { clampReportMonth, clampReportYear, getMonthlyReport } from "@/lib/reports/monthly-data";
import { type SelectedMonthStatus } from "@/lib/reports/monthly";
import { SearchableSelect } from "@/app/components/searchable-select";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type Props = {
  searchParams: Promise<{ year?: string; month?: string; includeInactive?: string }>;
};

const statusBadge: Record<SelectedMonthStatus, { label: string; state: MonthState }> = {
  PAID: { label: "Paid", state: "paid" },
  UPFRONT: { label: "Paid (upfront)", state: "ahead" },
  PARTIAL: { label: "Partial", state: "partial" },
  UNPAID: { label: "Unpaid", state: "unpaid" },
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
    <AdminPage>
      <PageHeader
        title={`${monthLabel(selectedYear, selectedMonth)} — outstanding detail`}
        subtitle="Monthly detail"
        back={{ href: "/reports", label: "Year grid" }}
        actions={
          <>
            <Link className="ui-button-secondary" href="/dashboard">
              <Home aria-hidden="true" size={17} />
              Dashboard
            </Link>
            <a className="ui-button-secondary" href={`/reports/monthly.xlsx?${exportQuery}`}>
              <FileSpreadsheet aria-hidden="true" size={17} />
              Excel
            </a>
            <a className="ui-button-secondary" href={`/reports/monthly.pdf?${exportQuery}`}>
              <FileText aria-hidden="true" size={17} />
              PDF
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Residents", value: summary.residentCount },
          { label: "Paid", value: summary.paidCount + summary.upfrontCount, helper: `${summary.upfrontCount} upfront` },
          { label: "Unpaid / partial", value: summary.unpaidCount + summary.partialCount },
          { label: "Outstanding", value: formatRM(summary.outstandingAmountSen) },
        ].map((card) => (
          <div className="ui-card p-4" key={card.label}>
            <p className="text-sm text-[var(--ink-2)]">{card.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold tracking-tight tabular-nums text-[var(--ink)]">{card.value}</p>
            {"helper" in card && <p className="ui-hint mt-1">{card.helper}</p>}
          </div>
        ))}
      </div>

      <section className="ui-card overflow-hidden">
        <form className="ui-toolbar" method="get">
          <div className="grid w-full gap-1 text-sm font-medium text-[var(--ink)] sm:w-44">
            Month
            <SearchableSelect
              name="month"
              defaultValue={String(selectedMonth)}
              options={months.map((m) => ({ value: String(m), label: monthLabel(selectedYear, m) }))}
              required
            />
          </div>
          <label className="ui-label w-full sm:w-32">
            Year
            <input className="ui-input" defaultValue={selectedYear} max={2100} min={2020} name="year" type="number" />
          </label>
          <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium text-[var(--ink)]">
            <input defaultChecked={includeInactive} name="includeInactive" type="checkbox" />
            Include inactive / moved-out
          </label>
          <button className="ui-button-primary self-end" type="submit">Apply</button>
        </form>

        <div className="overflow-x-auto">
          <table className="ui-table min-w-220">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Resident</th>
                <th>Paid until</th>
                <th>{monthLabel(selectedYear, selectedMonth)}</th>
                <th>Outstanding</th>
                <th>Extra</th>
                <th>Last payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row) => {
                const badge = statusBadge[row.selectedStatus];
                return (
                  <tr key={row.residentId}>
                    <td className="font-heading font-bold text-[var(--ink)]">{row.unitNumber}</td>
                    <td>
                      <Link className="font-medium text-[var(--blue)] hover:underline" href={`/residents/${row.residentId}`}>{row.name}</Link>
                    </td>
                    <td className="text-[var(--ink-2)]">
                      {row.paidUntilYear && row.paidUntilMonth ? monthLabel(row.paidUntilYear, row.paidUntilMonth) : "Not paid yet"}
                    </td>
                    <td>
                      <StatusPill state={badge.state} label={badge.label} />
                    </td>
                    <td className="text-[var(--ink-2)]">
                      {row.outstandingMonths > 0 ? (
                        <span>
                          <span className="font-semibold tabular-nums text-[var(--ink)]">{formatRM(row.outstandingAmountSen)}</span>
                          <span className="ui-hint mt-0.5 block">{row.outstandingMonths}m</span>
                        </span>
                      ) : <span className="text-[#1c7a33]">Up to date</span>}
                    </td>
                    <td className="text-[var(--ink-2)]">
                      {row.extraDueSen > 0 ? (
                        row.extraOutstandingSen > 0 ? <span className="font-semibold tabular-nums text-[#8a6300]">{formatRM(row.extraOutstandingSen)}</span> : <span className="text-[#1c7a33]">Cleared</span>
                      ) : <span className="text-[#c7c7cc]">—</span>}
                    </td>
                    <td className="whitespace-nowrap text-[var(--ink-2)]">{row.lastPaymentDate ? row.lastPaymentDate.toLocaleDateString("en-MY") : "—"}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7}><div className="ui-empty">No residents match this filter.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPage>
  );
}
