import { SubmitPaymentForm } from "./submit-payment-form";

export const runtime = "nodejs";

export default function PublicSubmitPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-3xl gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">DR2 Community</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Resident payment submission</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Submit your payment details for admin or AJK review. This form does not mark a payment as paid automatically.
          </p>
        </div>
        <SubmitPaymentForm />
      </div>
    </main>
  );
}