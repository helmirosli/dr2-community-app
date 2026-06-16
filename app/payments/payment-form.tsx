"use client";

import { useMemo, useState, useActionState } from "react";

import { createPayment, type PaymentFormState } from "@/lib/actions/payments";

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

  const expectedAmount = useMemo(() => {
    if (paymentType !== "MONTHLY_FEE") {
      return "";
    }

    const months = monthCount(startYear, startMonth, endYear, endMonth);
    return months > 0 ? (months * 50).toFixed(2) : "";
  }, [endMonth, endYear, paymentType, startMonth, startYear]);

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Resident
        <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue={selectedResidentId ?? ""} name="residentId" required>
          <option value="">Select resident</option>
          {residents.map((resident) => (
            <option key={resident.id} value={resident.id}>
              {resident.unitNumber} - {resident.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Payment type
          <select className="rounded-md border border-slate-300 px-3 py-2" name="paymentType" onChange={(event) => setPaymentType(event.target.value)} value={paymentType}>
            <option value="MONTHLY_FEE">Monthly resident fee</option>
            <option value="SPECIAL_COLLECTION">Special collection</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Amount paid (RM)
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={expectedAmount} key={expectedAmount} min="1" name="amount" required step="0.01" type="number" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Payment date
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={now.toISOString().slice(0, 10)} name="paymentDate" required type="date" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Method
          <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue="BANK_TRANSFER" name="method">
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="DUITNOW_QR">DuitNow / QR</option>
            <option value="EWALLET">E-wallet</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Reference number
          <input className="rounded-md border border-slate-300 px-3 py-2" name="referenceNo" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Start year
          <input className="rounded-md border border-slate-300 px-3 py-2" name="coverageStartYear" onChange={(event) => setStartYear(Number(event.target.value))} required type="number" value={startYear} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Start month
          <input className="rounded-md border border-slate-300 px-3 py-2" max="12" min="1" name="coverageStartMonth" onChange={(event) => setStartMonth(Number(event.target.value))} required type="number" value={startMonth} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          End year
          <input className="rounded-md border border-slate-300 px-3 py-2" name="coverageEndYear" onChange={(event) => setEndYear(Number(event.target.value))} required type="number" value={endYear} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          End month
          <input className="rounded-md border border-slate-300 px-3 py-2" max="12" min="1" name="coverageEndMonth" onChange={(event) => setEndMonth(Number(event.target.value))} required type="number" value={endMonth} />
        </label>
      </div>

      <div className="rounded-md bg-cyan-50 p-3 text-sm text-cyan-950">
        Expected monthly fee amount: <span className="font-semibold">{expectedAmount ? `RM${expectedAmount}` : "not applicable"}</span>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
        <input className="mt-1" name="allowAdjustment" type="checkbox" />
        <span>Allow adjusted amount when payment does not exactly match RM50 per selected month.</span>
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Receipt / proof upload
        <input accept="application/pdf,image/jpeg,image/png,image/webp" className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" name="proofFile" type="file" />
        <span className="text-xs font-normal text-slate-500">Optional for official records. PDF, JPG, PNG, or WebP only.</span>
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Notes
        <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2" name="notes" />
      </label>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending || residents.length === 0} type="submit">
        {pending ? "Recording..." : "Record payment"}
      </button>
    </form>
  );
}