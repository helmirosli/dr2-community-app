"use client";

import { useMemo, useState, useActionState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

import { createPayment, type PaymentFormState } from "@/lib/actions/payments";
import { SearchableSelect } from "@/app/components/searchable-select";

const initialState: PaymentFormState = {
  ok: false,
  message: "",
};

type PaymentResident = {
  id: string;
  unitNumber: string;
  name: string;
};

type PaymentFormProps = {
  residents: PaymentResident[];
  selectedResidentId?: string;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("en", { month: "long" }),
}));

const PAYMENT_TYPE_OPTIONS = [
  { value: "MONTHLY_FEE", label: "Monthly resident fee" },
  { value: "SPECIAL_COLLECTION", label: "Special collection" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "DUITNOW_QR", label: "DuitNow / QR" },
  { value: "EWALLET", label: "E-wallet" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

function monthCount(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
    return 0;
  }

  const count = (endYear - startYear) * 12 + endMonth - startMonth + 1;
  return count > 0 ? count : 0;
}

export function PaymentForm({ residents, selectedResidentId }: PaymentFormProps) {
  const now = new Date();
  const [state, action, pending] = useActionState(createPayment, initialState);
  const [paymentType, setPaymentType] = useState("MONTHLY_FEE");
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const residentOptions = useMemo(
    () => residents.map((r) => ({ value: r.id, label: `${r.unitNumber} - ${r.name}` })),
    [residents],
  );

  const expectedAmount = useMemo(() => {
    if (paymentType !== "MONTHLY_FEE") {
      return "";
    }

    const months = monthCount(startYear, startMonth, endYear, endMonth);
    return months > 0 ? (months * 50).toFixed(2) : "";
  }, [endMonth, endYear, paymentType, startMonth, startYear]);

  useEffect(() => {
    if (state.message && !state.ok) {
      dialogRef.current?.showModal();
    }
  }, [state]);

  return (
    <>
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md rounded-xl border border-red-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                Unable to Record Payment
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
            </div>
            <button
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      </dialog>

      <form action={action} className="grid gap-6 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
        {/* Resident */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">Resident</h3>
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            Select resident
            <SearchableSelect
              name="residentId"
              options={residentOptions}
              defaultValue={selectedResidentId}
              placeholder="Search by unit or name..."
              required
            />
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">Payment Information</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 text-sm font-medium text-slate-700">
              Payment type
              <SearchableSelect
                name="paymentType"
                options={PAYMENT_TYPE_OPTIONS}
                value={paymentType}
                onChange={setPaymentType}
                required
              />
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Amount paid (RM)
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                defaultValue={expectedAmount}
                key={expectedAmount}
                min="1"
                name="amount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Payment date
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                defaultValue={now.toISOString().slice(0, 10)}
                name="paymentDate"
                required
                type="date"
              />
            </label>
          </div>
        </div>

        {/* Method & Reference */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">Payment Method</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 text-sm font-medium text-slate-700">
              Method
              <SearchableSelect
                name="method"
                options={PAYMENT_METHOD_OPTIONS}
                defaultValue="BANK_TRANSFER"
                required
              />
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Reference number
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                name="referenceNo"
              />
            </label>
          </div>
        </div>

        {/* Coverage Period */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">Coverage Period</h3>
          <p className="mb-4 text-sm text-slate-600">Select the months this payment covers.</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2 text-sm font-medium text-slate-700">
              Start month
              <SearchableSelect
                name="coverageStartMonth"
                options={MONTH_OPTIONS}
                value={String(startMonth)}
                onChange={(v) => setStartMonth(Number(v))}
                required
              />
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Start year
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                name="coverageStartYear"
                onChange={(e) => setStartYear(Number(e.target.value))}
                required
                type="number"
                value={startYear}
              />
            </label>
            <div className="grid gap-2 text-sm font-medium text-slate-700">
              End month
              <SearchableSelect
                name="coverageEndMonth"
                options={MONTH_OPTIONS}
                value={String(endMonth)}
                onChange={(v) => setEndMonth(Number(v))}
                required
              />
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              End year
              <input
                className="rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                name="coverageEndYear"
                onChange={(e) => setEndYear(Number(e.target.value))}
                required
                type="number"
                value={endYear}
              />
            </label>
          </div>
          <div className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-950">
            Expected monthly fee amount: <span className="font-semibold">{expectedAmount ? `RM${expectedAmount}` : "not applicable"}</span>
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
            <input className="mt-1" name="allowAdjustment" type="checkbox" />
            <span>Allow adjusted amount when payment does not exactly match RM50 per selected month.</span>
          </label>
        </div>

        {/* Receipt Upload */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">Receipt / Proof</h3>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Upload file
            <input
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-slate-400 hover:bg-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="proofFile"
              type="file"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">Optional for official records. PDF, JPG, PNG, or WebP only.</p>
        </div>

        {/* Notes */}
        <div>
          <h3 className="mb-4 font-semibold text-slate-900">Notes</h3>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Additional notes
            <textarea
              className="min-h-24 rounded-lg border border-slate-300 px-4 py-2.5 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              name="notes"
            />
          </label>
        </div>

        {/* Messages */}
        {state.message && state.ok && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle className="shrink-0" size={18} />
            <p>{state.message}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={pending || residents.length === 0}
          type="submit"
        >
          {pending ? "Recording..." : "Record payment"}
        </button>
      </form>
    </>
  );
}