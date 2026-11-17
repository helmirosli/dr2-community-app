import { FileSpreadsheet, FileText } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getYearReport, parseReportParams } from "@/lib/reports/year-report";
import { ReportsView } from "./reports-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReportsPageProps = {
  searchParams: Promise<{
    year?: string;
    includeInactive?: string;
    q?: string;
    show?: string;
    totals?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireDashboardUser();
  const query = parseReportParams(await searchParams);

  const [t, locale, report] = await Promise.all([getDictionary(), getLocale(), getYearReport(query.year, query.includeInactive)]);

  const exportQuery = new URLSearchParams({
    year: String(query.year),
    ...(query.includeInactive ? { includeInactive: "on" } : {}),
  }).toString();

  return (
    <AdminPage>
      <PageHeader
        title={`${t.reports.heading} — ${query.year}`}
        subtitle={t.reports.title}
        actions={
          <div data-tour="reports-export" className="flex flex-wrap items-center gap-2">
            <a className="ui-button-secondary" href={`/reports/yearly.xlsx?${exportQuery}`}>
              <FileSpreadsheet size={15} />
              {t.reports.excel}
            </a>
            <a className="ui-button-secondary" href={`/reports/yearly.pdf?${exportQuery}`}>
              <FileText size={15} />
              {t.reports.pdf}
            </a>
            {/* Upload (file comparison) is on hold (KIV); route redirects to /reports. */}
          </div>
        }
      />
      <ReportsView t={t} locale={locale} report={report} query={query} />
    </AdminPage>
  );
}
