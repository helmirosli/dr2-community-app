"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

import {
  createPublicSubmission,
  type PublicSubmissionState,
} from "@/lib/actions/public-submissions";
import { TurnstileWidget } from "./turnstile-widget";

const initialState: PublicSubmissionState = {
  ok: false,
  message: "",
};

export function SubmitPaymentForm() {
  const [state, action, pending] = useActionState(createPublicSubmission, initialState);

  return (
    <form action={action} className="grid gap-6">
      <input aria-hidden="true" className="hidden" name="website" tabIndex={-1} />

      {/* Resident Information */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">Resident Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Unit number
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="unitNumber"
              placeholder="e.g., 01-01"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Resident name
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="residentName"
              placeholder="Full name"
              required
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Phone number
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="phone"
              placeholder="+60 1..."
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Payment type
            <select
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="paymentType"
              defaultValue="MONTHLY_FEE"
            >
              <option value="MONTHLY_FEE">Monthly resident fee (RM50)</option>
              <option value="SPECIAL_COLLECTION">Special collection</option>
            </select>
          </label>
        </div>
      </div>

      {/* Payment Information */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">Payment Information</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Amount (RM)
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              min="0.01"
              name="amount"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Payment date
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="paymentDate"
              required
              type="date"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Payment method
            <select
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="method"
              defaultValue="BANK_TRANSFER"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="DUITNOW_QR">DuitNow / QR</option>
              <option value="EWALLET">E-wallet</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>
      </div>

      {/* Coverage Period */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">Coverage Period</h3>
        <p className="mb-4 text-sm text-slate-600">
          Specify which months are covered by this payment.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Start month
            <select
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              defaultValue={new Date().getMonth() + 1}
              name="coverageStartMonth"
              required
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Start year
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              defaultValue={new Date().getFullYear()}
              name="coverageStartYear"
              required
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            End month
            <select
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              defaultValue={new Date().getMonth() + 1}
              name="coverageEndMonth"
              required
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            End year
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              defaultValue={new Date().getFullYear()}
              name="coverageEndYear"
              required
              type="number"
            />
          </label>
        </div>
      </div>

      {/* Additional Information */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">Additional Information</h3>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Reference number
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="referenceNo"
              placeholder="e.g., reference number from bank"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Notes
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="notes"
              placeholder="Any additional information..."
            />
          </label>
        </div>
      </div>

      {/* Payment Proof */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">Payment Proof</h3>
        <p className="mb-4 text-sm text-slate-600">
          Required for bank transfer, DuitNow, e-wallet, cheque, and other non-cash payments.
        </p>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Upload proof file
          <input
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-slate-400 hover:bg-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            name="proofFile"
            type="file"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">PDF, JPG, PNG, or WebP. Max 5MB.</p>
      </div>

      {/* Turnstile */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">Verification</h3>
        <TurnstileWidget />
      </div>

      {/* Messages */}
      {state.message && (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
          state.ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {state.ok ? (
            <CheckCircle className="shrink-0" size={18} />
          ) : (
            <AlertCircle className="shrink-0" size={18} />
          )}
          <p>{state.message}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Submitting..." : "Submit for Review"}
      </button>
    </form>
  );
}
