import { AdminPage, PageHeader } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { ResidentForm } from "../resident-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewResidentPage() {
  await requireDashboardUser();

  return (
    <AdminPage>
      <PageHeader
        title="Add resident"
        subtitle="Create a household record before recording official payments."
        back={{ href: "/residents", label: "Back to residents" }}
      />
      <ResidentForm />
    </AdminPage>
  );
}