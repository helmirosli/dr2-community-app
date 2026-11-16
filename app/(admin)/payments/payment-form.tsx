"use client";

import { useState, useActionState, useEffect, useRef, useMemo, useTransition } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

import { createPayment, getResidentSnapshot, type PaymentFormState, type ResidentSnapshot } from "@/lib/actions/payments";
import { SearchableDropdown } from "@/app/components/searchable-dropdown";
import { FileInput } from "@/app/components/file-input";

const initialState: PaymentFormState = { ok: false, message: "" };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("en", { month: "long" }),
}));

const PAYMENT_TYPE_OPTIONS = [
  { value: "MONTHLY_FEE",         label: "Monthly resident fee" },
  { value: "SPECIAL_COLLECTION",  label: "Special collection" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "DUITNOW_QR",   label: "DuitNow / QR" },
];

type PaymentResident = { id: string; unitNumber: string; name: string };
type SpecialCollection = { id: string; title: string; amountPerResident: number };

type PaymentFormProps = {
  residents: PaymentResident[];
  specialCollections: SpecialCollection[];
  selectedResidentId?: string;
};

function monthCount(sy: number, sm: number, ey: number, em: number) {
  const n = (ey - sy) * 12 + em - sm + 1;
  return n > 0 ? n : 0;
}

export function PaymentForm({ residents, specialCollections, selectedResidentId }: PaymentFormProps) {
  const now = new Date();
  const [state, action, pending] = useActionState(createPayment, initialState);
  const [isPeeking, startPeek] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [paymentType,   setPaymentType]   = useState("MONTHLY_FEE");
  const [residentId,    setResidentId]    = useState(selectedResidentId ?? "");
  const [snapshot,      setSnapshot]      = useState<ResidentSnapshot | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");

  const [startYear,  setStartYear]  = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear,    setEndYear]    = useState(now.getFullYear());
  const [endMonth,   setEndMonth]   = useState(now.getMonth() + 1);

  const isSpecialCollection = paymentType === "SPECIAL_COLLECTION";

  const residentOptions = useMemo(
    () => residents.map((r) => ({ value: r.id, label: `${r.unitNumber} — ${r.name}` })),
    [residents],
  );

  const collectionOptions = useMemo(
    () => specialCollections.map((c) => ({ value: c.id, label: c.title })),
    [specialCollections],
  );

  // Fetch resident snapshot whenever resident changes
  useEffect(() => {
    if (!residentId) { setSnapshot(null); return; }
    startPeek(async () => {
      const s = await getResidentSnapshot(residentId);
      setSnapshot(s);
      // Auto-fill coverage to first outstanding month
      if (s && s.outstandingMonths.length > 0 && paymentType === "MONTHLY_FEE") {
        const first = s.outstandingMonths[0];
        const last  = s.outstandingMonths[s.outstandingMonths.length - 1];
        setStartMonth(first);
        setStartYear(s.currentYear);
        setEndMonth(last);
        setEndYear(s.currentYear);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  // When switching to special collection, auto-select resident's first assigned collection
  useEffect(() => {
    if (isSpecialCollection && snapshot?.assignedCollections.length) {
      const first = snapshot.assignedCollections.find((c) => c.outstanding > 0)
        ?? snapshot.assignedCollections[0];
      setSelectedCollectionId(first.id);
    } else if (!isSpecialCollection) {
      setSelectedCollectionId("");
    }
  }, [isSpecialCollection, snapshot]);

  const expectedAmount = useMemo(() => {
    if (isSpecialCollection) {
      const col = specialCollections.find((c) => c.id === selectedCollectionId);
      return col ? (col.amountPerResident / 100).toFixed(2) : "";
    }
    const n = monthCount(startYear, startMonth, endYear, endMonth);
    return n > 0 ? (n * 50).toFixed(2) : "";
  }, [isSpecialCollection, selectedCollectionId, specialCollections, startYear, startMonth, endYear, endMonth]);

  useEffect(() => {
    if (state.message && !state.ok) dialogRef.current?.showModal();
  }, [state]);

  return (
    <>
      {/* Error dialog */}
      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md rounded-[18px] bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffe6e0]">
              <AlertCircle className="text-[#c2341a]" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-base font-bold text-[var(--ink)]">Unable to Record Payment</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{state.message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="ui-button-danger" onClick={() => dialogRef.current?.close()} type="button">
              OK
            </button>
          </div>
        </div>
      </dialog>

      <form action={action} className="grid gap-5">
        <div className="ui-card overflow-hidden">
          {/* Resident */}
          <section className="ui-form-section">
            <h2 className="ui-section-title">Resident</h2>
            <SearchableDropdown
              name="residentId"
              options={residentOptions}
              defaultValue={residentId}
              placeholder="Search by unit or name..."
              required
              onChange={(v) => setResidentId(v)}
            />

            {isPeeking && (
              <div className="ui-hint flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} />
                Loading resident info...
              </div>
            )}

            {!isPeeking && snapshot && (
              <div className="grid gap-3 rounded-2xl bg-[var(--paper)] p-4">
                <div>
                  <p className="font-semibold text-[var(--ink)]">Unit {snapshot.unitNumber} · {snapshot.name}</p>
                  <p className="ui-hint mt-0.5">
                    {snapshot.latestCoverage
                      ? `Last paid: ${MONTH_LABELS[snapshot.latestCoverage.month - 1]} ${snapshot.latestCoverage.year}`
                      : "No payments recorded"}
                  </p>
                </div>

                {snapshot.outstandingMonths.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-[#8a6300]">
                      {snapshot.outstandingMonths.length} outstanding month{snapshot.outstandingMonths.length > 1 ? "s" : ""} in {snapshot.currentYear}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {snapshot.outstandingMonths.map((m) => (
                        <span key={m} className="ui-chip bg-[#ffe6e0] text-[#c2341a]">
                          {MONTH_LABELS[m - 1]}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-[#1c7a33]">✓ All months paid for {snapshot.currentYear}</p>
                )}

                {snapshot.assignedCollections.length > 0 && (
                  <div className="border-t border-black/[0.06] pt-3">
                    <p className="ui-hint mb-1.5 font-medium">Assigned special collections</p>
                    <div className="grid gap-1">
                      {snapshot.assignedCollections.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-[var(--ink)]">{c.title}</span>
                          {c.outstanding > 0 ? (
                            <span className="ui-chip bg-[#fff4d6] text-[#8a6300]">RM{(c.outstanding / 100).toFixed(2)} left</span>
                          ) : (
                            <span className="ui-chip bg-[#e2f7e1] text-[#1c7a33]">✓ Paid</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Payment: type, collection, amount, date, method, reference */}
          <section className="ui-form-section">
            <h2 className="ui-section-title">Payment</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ui-label">
                Type
                <SearchableDropdown
                  name="paymentType"
                  options={PAYMENT_TYPE_OPTIONS}
                  value={paymentType}
                  onChange={setPaymentType}
                  required
                />
              </div>

              {isSpecialCollection && (
                <div className="ui-label">
                  Collection
                  {collectionOptions.length > 0 ? (
                    <SearchableDropdown
                      name="specialCollectionId"
                      options={collectionOptions}
                      value={selectedCollectionId}
                      onChange={setSelectedCollectionId}
                      required
                    />
                  ) : (
                    <p className="rounded-2xl bg-[#fff4d6] p-3 text-xs font-medium text-[#8a6300]">
                      No active special collections.
                    </p>
                  )}
                </div>
              )}
            </div>

            {isSpecialCollection && selectedCollectionId && snapshot && (() => {
              const col = snapshot.assignedCollections.find((c) => c.id === selectedCollectionId);
              if (!col) return null;
              return (
                <div className="rounded-2xl bg-[#ddf5fd] px-4 py-3 text-sm">
                  <span className="text-[var(--ink-2)]">Outstanding for this resident: </span>
                  <span className="font-semibold tabular-nums text-[#0b6e8e]">RM{(col.outstanding / 100).toFixed(2)}</span>
                </div>
              );
            })()}

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="ui-label">
                Amount (RM)
                <input
                  className="ui-input"
                  defaultValue={expectedAmount}
                  key={expectedAmount}
                  min="1"
                  name="amount"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="ui-label">
                Payment date
                <input
                  className="ui-input"
                  defaultValue={now.toISOString().slice(0, 10)}
                  name="paymentDate"
                  required
                  type="date"
                />
              </label>
              <div className="ui-label">
                Method
                <SearchableDropdown
                  name="method"
                  options={PAYMENT_METHOD_OPTIONS}
                  defaultValue="BANK_TRANSFER"
                  required
                />
              </div>
            </div>
            <label className="ui-label">
              Reference number
              <input className="ui-input" name="referenceNo" placeholder="e.g. TXN123456" />
            </label>
          </section>

          {/* Coverage months (monthly only) */}
          {!isSpecialCollection ? (
            <section className="ui-form-section">
              <div>
                <h2 className="ui-section-title">Coverage months</h2>
                <p className="ui-hint mt-1">Select the months this payment covers.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="ui-label">
                  Start month
                  <SearchableDropdown
                    name="coverageStartMonth"
                    options={MONTH_OPTIONS}
                    value={String(startMonth)}
                    onChange={(v) => setStartMonth(Number(v))}
                    required
                  />
                </div>
                <label className="ui-label">
                  Start year
                  <input
                    className="ui-input"
                    name="coverageStartYear"
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    required
                    type="number"
                    value={startYear}
                  />
                </label>
                <div className="ui-label">
                  End month
                  <SearchableDropdown
                    name="coverageEndMonth"
                    options={MONTH_OPTIONS}
                    value={String(endMonth)}
                    onChange={(v) => setEndMonth(Number(v))}
                    required
                  />
                </div>
                <label className="ui-label">
                  End year
                  <input
                    className="ui-input"
                    name="coverageEndYear"
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    required
                    type="number"
                    value={endYear}
                  />
                </label>
              </div>

              {expectedAmount && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
                  <span className="text-[var(--ink-2)]">
                    {monthCount(startYear, startMonth, endYear, endMonth)} month{monthCount(startYear, startMonth, endYear, endMonth) !== 1 ? "s" : ""} · expected
                  </span>
                  <span className="font-heading font-bold tabular-nums text-[var(--ink)]">RM{expectedAmount}</span>
                </div>
              )}

              <label className="flex items-start gap-3 rounded-2xl bg-[var(--paper)] p-3 text-sm font-medium text-[var(--ink)]">
                <input className="mt-0.5" name="allowAdjustment" type="checkbox" />
                <span>Allow adjusted amount (when payment doesn&apos;t exactly match RM50 per month)</span>
              </label>
            </section>
          ) : (
            <>
              <input type="hidden" name="coverageStartMonth" value={now.getMonth() + 1} />
              <input type="hidden" name="coverageStartYear"  value={now.getFullYear()} />
              <input type="hidden" name="coverageEndMonth"   value={now.getMonth() + 1} />
              <input type="hidden" name="coverageEndYear"    value={now.getFullYear()} />
            </>
          )}

          {/* Proof & notes */}
          <section className="ui-form-section">
            <h2 className="ui-section-title">Proof &amp; notes</h2>
            <div className="ui-label">
              Receipt / proof (optional)
              <FileInput name="proofFile" />
            </div>
            <label className="ui-label">
              Notes (optional)
              <textarea className="ui-textarea min-h-20" name="notes" />
            </label>
          </section>
        </div>

        {state.message && state.ok && (
          <div className="ui-alert-success flex items-center gap-3">
            <CheckCircle size={16} />
            <p>{state.message}</p>
          </div>
        )}

        <button
          className="ui-button-primary w-full py-3 text-base"
          disabled={pending || residents.length === 0}
          type="submit"
        >
          {pending ? "Recording..." : "Record payment"}
        </button>
      </form>
    </>
  );
}
