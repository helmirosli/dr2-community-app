import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { SubmitPaymentForm } from "./submit-payment-form";

export const runtime = "nodejs";

export default function PublicSubmitPage() {
  return (
    <div className="grid gap-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Submit Payment</h1>
          <p className="mt-3 text-base text-slate-600">
            Record your payment for resident fees or special collections. Your submission will be reviewed by the admin or AJK team.
          </p>
        </div>
        <Link
          href="/status"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          <BarChart3 size={18} />
          <span>View Status</span>
        </Link>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-3xl font-bold text-cyan-600">RM 50</div>
          <p className="mt-1 text-sm text-slate-600">Monthly resident fee</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-3xl font-bold text-emerald-600">✓</div>
          <p className="mt-1 text-sm text-slate-600">Payment proof required</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-3xl font-bold text-amber-600">24h</div>
          <p className="mt-1 text-sm text-slate-600">Typical review time</p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-6 text-xl font-bold text-slate-900">Payment Details</h2>
        <SubmitPaymentForm />
      </div>

      {/* Help section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h3 className="font-semibold text-amber-900">Need help with payment proof?</h3>
          <p className="mt-2 text-sm text-amber-800">
            Take a screenshot of your bank transaction receipt, transfer confirmation, or payment app notification.
          </p>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 sm:p-5">
          <h3 className="font-semibold text-cyan-900">Questions?</h3>
          <p className="mt-2 text-sm text-cyan-800">
            Contact the AJK team or check your building's WhatsApp group for payment details and deadlines.
          </p>
        </div>
      </div>
    </div>
  );
}
