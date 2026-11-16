import { AdminPage, PageHeader } from "@/app/components/page-header";
import { requireDashboardUser } from "@/lib/auth";
import { FileUploadForm } from "./file-upload-form";

export const runtime = "nodejs";

export default async function FileUploadPage() {
  await requireDashboardUser();

  return (
    <AdminPage width="narrow">
      <PageHeader
        title="Upload & Compare Payments"
        subtitle="Upload a CSV or Excel file with payment data. The system will compare it with your current records and show differences for review."
        back={{ href: "/reports", label: "Reporting" }}
      />

      {/* Instructions */}
      <section className="ui-card ui-form-section">
        <div>
          <h2 className="ui-section-title">File Format</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            Your CSV or Excel file should have columns: Unit Number, Resident Name, Amount (RM), Payment Date, Method
          </p>
        </div>
        <div className="grid gap-1 text-sm text-[var(--ink-2)]">
          <p><span className="font-medium text-[var(--ink)]">Unit Number:</span> e.g., 01-01</p>
          <p><span className="font-medium text-[var(--ink)]">Resident Name:</span> Full name</p>
          <p><span className="font-medium text-[var(--ink)]">Amount (RM):</span> Payment amount in RM (e.g., 50.00)</p>
          <p><span className="font-medium text-[var(--ink)]">Payment Date:</span> YYYY-MM-DD format</p>
          <p><span className="font-medium text-[var(--ink)]">Method:</span> Cash, Bank Transfer, DuitNow QR, E-wallet, Cheque, or Other</p>
        </div>
      </section>

      {/* Upload Form */}
      <FileUploadForm />

      {/* Info */}
      <section className="ui-card ui-form-section">
        <h3 className="ui-section-title">What Happens Next</h3>
        <ol className="grid gap-2 text-sm text-[var(--ink-2)]">
          <li>1. Upload your file and click &quot;Analyze&quot;</li>
          <li>2. Review the comparison showing new payments, existing matches, and conflicts</li>
          <li>3. Accept new payments or reject duplicates</li>
          <li>4. Confirmed payments will be recorded in the system</li>
        </ol>
      </section>
    </AdminPage>
  );
}
