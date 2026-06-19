"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

import {
  createPublicSubmission,
  type PublicSubmissionState,
} from "@/lib/actions/public-submissions";
import { useDictionary } from "@/lib/i18n/context";
import { SearchableSelect } from "@/app/components/searchable-select";
import { TurnstileWidget } from "./turnstile-widget";

const initialState: PublicSubmissionState = {
  ok: false,
  message: "",
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("en", { month: "long" }),
}));

export function SubmitPaymentForm() {
  const [state, action, pending] = useActionState(createPublicSubmission, initialState);
  const { t } = useDictionary();
  const errorDialogRef = useRef<HTMLDialogElement>(null);
  const successDialogRef = useRef<HTMLDialogElement>(null);

  const paymentTypeOptions = [
    { value: "MONTHLY_FEE", label: t.publicSubmit.monthlyFeeOption },
    { value: "SPECIAL_COLLECTION", label: t.publicSubmit.specialCollectionOption },
  ];

  const paymentMethodOptions = [
    { value: "CASH", label: t.publicSubmit.cash },
    { value: "BANK_TRANSFER", label: t.publicSubmit.bankTransfer },
    { value: "DUITNOW_QR", label: t.publicSubmit.duitnowQr },
    { value: "EWALLET", label: t.publicSubmit.ewallet },
    { value: "CHEQUE", label: t.publicSubmit.cheque },
    { value: "OTHER", label: t.publicSubmit.other },
  ];

  useEffect(() => {
    if (state.message && !state.ok) {
      errorDialogRef.current?.showModal();
    }
  }, [state]);

  useEffect(() => {
    if (state.message && state.ok) {
      successDialogRef.current?.showModal();
    }
  }, [state]);

  return (
    <>
      {/* Error dialog */}
      <dialog
        ref={errorDialogRef}
        className="m-auto w-full max-w-md rounded-xl border border-red-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                Unable to Process Submission
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
            </div>
            <button
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={() => errorDialogRef.current?.close()}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              onClick={() => errorDialogRef.current?.close()}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      </dialog>

      {/* Success dialog */}
      <dialog
        ref={successDialogRef}
        className="m-auto w-full max-w-md rounded-xl border border-emerald-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                Submission Received
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
            </div>
            <button
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={() => successDialogRef.current?.close()}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              onClick={() => successDialogRef.current?.close()}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      </dialog>

      <form action={action} className="grid gap-6">
      <input aria-hidden="true" className="hidden" name="website" tabIndex={-1} />

      {/* Resident Information */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.residentInfo}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.unitNumber}
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="unitNumber"
              placeholder={t.publicSubmit.unitPlaceholder}
              required
            />
          </label>
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.paymentType}
            <SearchableSelect
              name="paymentType"
              options={paymentTypeOptions}
              defaultValue="MONTHLY_FEE"
              required
            />
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.paymentInfo}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.amount}
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              min="0.01"
              name="amount"
              placeholder={t.publicSubmit.amountPlaceholder}
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.paymentDate}
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="paymentDate"
              required
              type="date"
            />
          </label>
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.paymentMethod}
            <SearchableSelect
              name="method"
              options={paymentMethodOptions}
              defaultValue="BANK_TRANSFER"
              required
            />
          </div>
        </div>
      </div>

      {/* Coverage Period */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.coveragePeriod}</h3>
        <p className="mb-4 text-sm text-slate-600">{t.publicSubmit.coveragePeriodDesc}</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.startMonth}
            <SearchableSelect
              name="coverageStartMonth"
              options={MONTH_OPTIONS}
              defaultValue={String(new Date().getMonth() + 1)}
              required
            />
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.startYear}
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              defaultValue={new Date().getFullYear()}
              name="coverageStartYear"
              required
              type="number"
            />
          </label>
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.endMonth}
            <SearchableSelect
              name="coverageEndMonth"
              options={MONTH_OPTIONS}
              defaultValue={String(new Date().getMonth() + 1)}
              required
            />
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.endYear}
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
        <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.additionalInfo}</h3>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.referenceNo}
            <input
              className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="referenceNo"
              placeholder={t.publicSubmit.referencePlaceholder}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t.publicSubmit.notes}
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="notes"
              placeholder={t.publicSubmit.notesPlaceholder}
            />
          </label>
        </div>
      </div>

      {/* Payment Proof */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.paymentProof}</h3>
        <p className="mb-4 text-sm text-slate-600">{t.publicSubmit.paymentProofDesc}</p>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {t.publicSubmit.uploadProof}
          <input
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-slate-400 hover:bg-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            name="proofFile"
            type="file"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">{t.publicSubmit.uploadHint}</p>
      </div>

      {/* Turnstile */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.verification}</h3>
        <TurnstileWidget />
      </div>

      {/* Submit button */}
      <button
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? t.publicSubmit.submitting : t.publicSubmit.submitForReview}
      </button>
    </form>
    </>
  );
}
