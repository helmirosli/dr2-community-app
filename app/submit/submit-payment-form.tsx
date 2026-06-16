"use client";

import { useActionState } from "react";

import {
  createPublicSubmission,
  type PublicSubmissionState,
} from "@/lib/actions/public-submissions";

const initialState: PublicSubmissionState = {
  ok: false,
  message: "",
};

export function SubmitPaymentForm() {
  const [state, action, pending] = useActionState(createPublicSubmission, initialState);

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <input aria-hidden="true" className="hidden" name="website" tabIndex={-1} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Unit number
          <input className="rounded-md border border-slate-300 px-3 py-2" name="unitNumber" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Resident name
          <input className="rounded-md border border-slate-300 px-3 py-2" name="residentName" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Phone number
          <input className="rounded-md border border-slate-300 px-3 py-2" name="phone" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Payment type
          <select className="rounded-md border border-slate-300 px-3 py-2" name="paymentType" defaultValue="MONTHLY_FEE">
            <option value="MONTHLY_FEE">Monthly resident fee</option>
            <option value="SPECIAL_COLLECTION">Special collection</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Amount paid (RM)
          <input className="rounded-md border border-slate-300 px-3 py-2" min="1" name="amount" required step="0.01" type="number" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Payment date
          <input className="rounded-md border border-slate-300 px-3 py-2" name="paymentDate" required type="date" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Method
          <select className="rounded-md border border-slate-300 px-3 py-2" name="method" defaultValue="BANK_TRANSFER">
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="DUITNOW_QR">DuitNow / QR</option>
            <option value="EWALLET">E-wallet</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Start year
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={new Date().getFullYear()} name="coverageStartYear" required type="number" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Start month
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={new Date().getMonth() + 1} max="12" min="1" name="coverageStartMonth" required type="number" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          End year
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={new Date().getFullYear()} name="coverageEndYear" required type="number" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          End month
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={new Date().getMonth() + 1} max="12" min="1" name="coverageEndMonth" required type="number" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Reference number
        <input className="rounded-md border border-slate-300 px-3 py-2" name="referenceNo" />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Notes
        <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2" name="notes" />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Payment proof
        <input accept="application/pdf,image/jpeg,image/png,image/webp" className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" name="proofFile" type="file" />
        <span className="text-xs font-normal text-slate-500">Required for bank transfer, DuitNow, e-wallet, cheque, and other non-cash payments. PDF, JPG, PNG, or WebP only.</span>
      </label>

      {state.message ? (
        <p className={state.ok ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-red-700"}>
          {state.message}
        </p>
      ) : null}

      <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}