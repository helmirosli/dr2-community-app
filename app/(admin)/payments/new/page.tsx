import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { PaymentForm } from "../payment-form";
import { sortByUnit } from "@/lib/units";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NewPaymentPageProps = {
  searchParams?: Promise<{ residentId?: string }>;
};

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  await requireDashboardUser();
  const params = await searchParams;

  const [residents, specialCollections] = await Promise.all([
    prisma.resident.findMany({
      where: { status: "ACTIVE" },
      orderBy: { unitNumber: "asc" },
      select: { id: true, unitNumber: true, name: true },
    }),
    prisma.specialCollection.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, amountPerResident: true },
    }),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Record official payment"
        subtitle="Record monthly fees, backdated payments, upfront payments, or special collections for an active resident."
        back={{ href: "/payments", label: "Payment records" }}
      />
      {residents.length > 0 ? (
        <PaymentForm residents={sortByUnit(residents)} specialCollections={specialCollections} selectedResidentId={params?.residentId} />
      ) : (
        <div className="ui-card ui-empty">Add at least one active resident before recording payments.</div>
      )}
    </AdminPage>
  );
}
