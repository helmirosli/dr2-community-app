import { approveSubmission, rejectSubmission } from "@/lib/actions/review-submissions";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getReviewData } from "@/lib/reports/review-queue";
import { ReviewView } from "./review-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireDashboardUser();
  const { id } = await searchParams;
  const [t, locale, data] = await Promise.all([getDictionary(), getLocale(), getReviewData(id)]);

  return (
    <ReviewView
      t={t}
      locale={locale}
      data={data}
      actions={
        data.kind === "item"
          ? { approve: approveSubmission.bind(null, data.item.id), reject: rejectSubmission.bind(null, data.item.id) }
          : { approve: async () => {}, reject: async () => {} }
      }
    />
  );
}
