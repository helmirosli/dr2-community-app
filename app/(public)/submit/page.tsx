import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { getDictionary } from "@/lib/i18n";
import { SubmitPaymentForm } from "./submit-payment-form";

export const runtime = "nodejs";

export default async function PublicSubmitPage() {
  const t = await getDictionary();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 [&>*]:min-w-0">
      {/* Header section */}
      <header>
        <Link
          className="text-sm font-semibold text-cyan-700 hover:text-cyan-900 transition-colors"
          href="/status"
        >
          <BarChart3 size={16} className="mr-1 inline" />
          {t.publicSubmit.viewStatus}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t.publicSubmit.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.publicSubmit.subtitle}</p>
      </header>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm sm:p-5">
          <div className="text-2xl font-bold text-cyan-600">{t.publicSubmit.monthlyFeeAmount}</div>
          <p className="mt-1 text-sm text-slate-600">{t.publicSubmit.monthlyFeeLabel}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm sm:p-5">
          <div className="text-2xl font-bold text-emerald-600">✓</div>
          <p className="mt-1 text-sm text-slate-600">{t.publicSubmit.proofRequired}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-white p-4 shadow-sm sm:p-5">
          <div className="text-2xl font-bold text-amber-600">{t.publicSubmit.reviewTime}</div>
          <p className="mt-1 text-sm text-slate-600">{t.publicSubmit.reviewTimeLabel}</p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">{t.publicSubmit.paymentDetails}</h2>
        <SubmitPaymentForm />
      </div>

      {/* Help section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border-accent bg-amber-50 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-amber-900">{t.publicSubmit.helpTitle}</h3>
          <p className="mt-2 text-sm text-amber-800">{t.publicSubmit.helpDesc}</p>
        </div>
        <div className="rounded-xl border border-border-accent bg-cyan-50 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-cyan-900">{t.publicSubmit.questionsTitle}</h3>
          <p className="mt-2 text-sm text-cyan-800">{t.publicSubmit.questionsDesc}</p>
        </div>
      </div>
    </div>
  );
}
