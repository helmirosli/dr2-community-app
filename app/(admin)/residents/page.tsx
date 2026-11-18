import Link from "next/link";
import { Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getDirectory, parseDirectoryParams } from "@/lib/reports/residents-directory";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { ResidentsView } from "./residents-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResidentsPageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; perPage?: string; view?: string }>;
};

export default async function ResidentsPage({ searchParams }: ResidentsPageProps) {
  const params = await searchParams;
  const { filters, view, page, perPage } = parseDirectoryParams(params);

  const [, t, locale, dir] = await Promise.all([requireDashboardUser(), getDictionary(), getLocale(), getDirectory(filters, page, perPage, view === "map")]);

  return (
    <AdminPage>
      <PageHeader
        title={t.residents.title}
        subtitle={t.residents.subtitle}
        actions={
          <Link className="ui-button-primary" href="/residents/new">
            <Plus aria-hidden="true" size={16} />
            {t.residents.addResident}
          </Link>
        }
      />
      <ResidentsView t={t} locale={locale} dir={dir} filters={filters} view={view} perPage={perPage} />
    </AdminPage>
  );
}
