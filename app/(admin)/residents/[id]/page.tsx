import { notFound } from "next/navigation";

import { AdminPage } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getResidentDetail, parseResidentParams } from "@/lib/reports/resident-detail";
import { ResidentDetailView } from "./resident-detail-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ResidentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; page?: string; perPage?: string }>;
};

export default async function ResidentDetailPage({ params, searchParams }: ResidentDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const opts = parseResidentParams(query);

  const [, t, locale, detail] = await Promise.all([requireDashboardUser(), getDictionary(), getLocale(), getResidentDetail(id, opts)]);
  if (!detail) notFound();

  return (
    <AdminPage>
      <ResidentDetailView t={t} locale={locale} d={detail} perPage={opts.perPage} />
    </AdminPage>
  );
}
