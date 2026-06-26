"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

import {
  createPublicSubmission,
  type PublicSubmissionState,
} from "@/lib/actions/public-submissions";
import { useDictionary } from "@/lib/i18n/context";
import { SearchableSelect } from "@/app/components/searchable-select";
import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";

const initialState: PublicSubmissionState = {
  ok: false,
  message: "",
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("en", { month: "long" }),
}));

type SpecialCollection = { id: string; title: string };

export function SubmitPaymentForm({ specialCollections }: { specialCollections: SpecialCollection[] }) {
  const [state, action, pending] = useActionState(createPublicSubmission, initialState);
  const { t } = useDictionary();
  const errorDialogRef = useRef<HTMLDialogElement>(null);
  const successDialogRef = useRef<HTMLDialogElement>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [paymentType, setPaymentType] = useState("MONTHLY_FEE");

  const paymentTypeOptions = [
    { value: "MONTHLY_FEE", label: t.publicSubmit.monthlyFeeOption },
    { value: "SPECIAL_COLLECTION", label: t.publicSubmit.specialCollectionOption },
  ];

  const paymentMethodOptions = [
    { value: "BANK_TRANSFER", label: t.publicSubmit.bankTransfer },
    { value: "DUITNOW_QR", label: t.publicSubmit.duitnowQr },
  ];

  const collectionOptions = specialCollections.map((c) => ({
    value: c.id,
    label: c.title,
  }));

  const isSpecialCollection = paymentType === "SPECIAL_COLLECTION";

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
              onClick={() => {
                errorDialogRef.current?.close();
                turnstileRef.current?.reset();
              }}
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
              onClick={() => {
                successDialogRef.current?.close();
                formRef.current?.reset();
                turnstileRef.current?.reset();
                setPaymentType("MONTHLY_FEE");
              }}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      </dialog>

      <form action={action} className="grid gap-6" ref={formRef}>
        <input aria-hidden="true" className="hidden" name="website" tabIndex={-1} />

        {/* Resident Information */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.residentInfo}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="ui-label">
              {t.publicSubmit.unitNumber}
              <input
                className="ui-input"
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
                onChange={(val) => setPaymentType(val)}
              />
            </div>
          </div>
        </div>

        {/* Special Collection selector — only shown when SPECIAL_COLLECTION selected */}
        {isSpecialCollection && (
          <div>
            <h3 className="mb-4 font-semibold text-slate-900">Collection</h3>
            {collectionOptions.length > 0 ? (
              <div className="grid gap-2 text-sm font-medium text-slate-700">
                Select Collection
                <SearchableSelect
                  name="specialCollectionId"
                  options={collectionOptions}
                  defaultValue={collectionOptions[0]?.value}
                  required
                />
              </div>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                There are no active special collections at this time. Please contact AJK for more information.
              </p>
            )}
          </div>
        )}

        {/* Payment Information */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.paymentInfo}</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="ui-label">
              {t.publicSubmit.amount}
              <input
                className="ui-input"
                min="0.01"
                name="amount"
                placeholder={t.publicSubmit.amountPlaceholder}
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="ui-label">
              {t.publicSubmit.paymentDate}
              <input
                className="ui-input"
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

        {/* Coverage Period — only shown for MONTHLY_FEE */}
        {!isSpecialCollection && (
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
              <label className="ui-label">
                {t.publicSubmit.startYear}
                <input
                  className="ui-input"
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
              <label className="ui-label">
                {t.publicSubmit.endYear}
                <input
                  className="ui-input"
                  defaultValue={new Date().getFullYear()}
                  name="coverageEndYear"
                  required
                  type="number"
                />
              </label>
            </div>
          </div>
        )}

        {/* Hidden coverage fields for SPECIAL_COLLECTION (use current month as placeholder) */}
        {isSpecialCollection && (
          <>
            <input type="hidden" name="coverageStartMonth" value={new Date().getMonth() + 1} />
            <input type="hidden" name="coverageStartYear" value={new Date().getFullYear()} />
            <input type="hidden" name="coverageEndMonth" value={new Date().getMonth() + 1} />
            <input type="hidden" name="coverageEndYear" value={new Date().getFullYear()} />
          </>
        )}

        {/* Additional Information */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.additionalInfo}</h3>
          <div className="grid gap-4">
            <label className="ui-label">
              {t.publicSubmit.referenceNo}
              <input
                className="ui-input"
                name="referenceNo"
                placeholder={t.publicSubmit.referencePlaceholder}
              />
            </label>
            <label className="ui-label">
              {t.publicSubmit.notes}
              <textarea
                className="ui-textarea min-h-24"
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
          <label className="ui-label">
            {t.publicSubmit.uploadProof}
            <input
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="ui-file-input text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              name="proofFile"
              type="file"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">{t.publicSubmit.uploadHint}</p>
        </div>

        {/* Turnstile */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">{t.publicSubmit.verification}</h3>
          <TurnstileWidget ref={turnstileRef} />
        </div>

        {/* Submit button */}
        <button className="ui-button-primary" disabled={pending} type="submit">
          {pending ? t.publicSubmit.submitting : t.publicSubmit.submitForReview}
        </button>
      </form>
    </>
  );
}
