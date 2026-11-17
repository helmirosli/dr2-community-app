import Link from "next/link";
import { Plus } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getCollectionsOverview } from "@/lib/reports/collections-overview";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { CollectionsView } from "./collections-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SpecialCollectionsPage() {
  await requireDashboardUser();

  const [t, locale, collections] = await Promise.all([getDictionary(), getLocale(), getCollectionsOverview()]);

  return (
    <AdminPage>
      <PageHeader
        title={t.collections.title}
        subtitle={t.collections.subtitle}
        actions={
          <Link data-tour="collections-new" className="ui-button-primary" href="/special-collections/new">
            <Plus aria-hidden="true" size={16} />
            {t.collections.newCollection}
          </Link>
        }
      />
      <CollectionsView collections={collections} t={t} locale={locale} now={new Date()} />
    </AdminPage>
  );
}
