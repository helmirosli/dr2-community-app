import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { FileUploadForm } from "./file-upload-form";

export const runtime = "nodejs";

export default async function FileUploadPage() {
  await requireDashboardUser();

  return (
    <main className="px-6 py-8">
      <div className="mx-auto grid max-w-4xl gap-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/reports" className="transition-colors hover:text-slate-700">
            Reporting
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">File Upload</span>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="ui-button-secondary"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        <header>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Upload & Compare Payments
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Upload a CSV or Excel file with payment data. The system will compare it with your current records and show differences for review.
          </p>
        </header>

        <div className="grid gap-6">
          {/* Instructions */}
          <div className="ui-card bg-slate-50 p-6">
            <h2 className="font-semibold text-slate-900">File Format</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your CSV or Excel file should have columns: Unit Number, Resident Name, Amount (RM), Payment Date, Method
            </p>
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p><span className="font-medium">Unit Number:</span> e.g., 01-01</p>
              <p><span className="font-medium">Resident Name:</span> Full name</p>
              <p><span className="font-medium">Amount (RM):</span> Payment amount in RM (e.g., 50.00)</p>
              <p><span className="font-medium">Payment Date:</span> YYYY-MM-DD format</p>
              <p><span className="font-medium">Method:</span> Cash, Bank Transfer, DuitNow QR, E-wallet, Cheque, or Other</p>
            </div>
          </div>

          {/* Upload Form */}
          <FileUploadForm />

          {/* Info */}
          <div className="ui-card bg-brand-50 p-6">
            <h3 className="font-semibold text-slate-900">What Happens Next</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-700">
              <li>1. Upload your file and click &quot;Analyze&quot;</li>
              <li>2. Review the comparison showing new payments, existing matches, and conflicts</li>
              <li>3. Accept new payments or reject duplicates</li>
              <li>4. Confirmed payments will be recorded in the system</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
