import { notFound } from "next/navigation";

import { AdminPage } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getCollectionsOverview } from "@/lib/reports/collections-overview";
import { CollectionDetailView, parseHouseParams } from "../collection-detail-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; perPage?: string; filter?: string; search?: string }>;
};

export default async function SpecialCollectionDetailPage({ params, searchParams }: DetailPageProps) {
  await requireDashboardUser();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [t, locale, [collection]] = await Promise.all([getDictionary(), getLocale(), getCollectionsOverview(id)]);
  if (!collection) notFound();

  return (
    <AdminPage>
      <CollectionDetailView t={t} locale={locale} c={collection} params={parseHouseParams(query)} now={new Date()} />
    </AdminPage>
  );
}
