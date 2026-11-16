"use client";

import Link from "next/link";
import { useState, useActionState, useEffect, useRef, useMemo, useTransition } from "react";
import { AlertCircle, CalendarDays, Check, CheckCircle, FileText, ImageUp, Landmark, Loader2, QrCode, Sparkles, X, type LucideIcon } from "lucide-react";

import { createPayment, getResidentSnapshot, type PaymentFormState, type ResidentSnapshot } from "@/lib/actions/payments";
import { SearchableDropdown } from "@/app/components/searchable-dropdown";

const initialState: PaymentFormState = { ok: false, message: "" };

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString("en", { month: "long" }),
}));

type TileOption = { value: string; title: string; hint: string; icon: LucideIcon; tone: string };

const PAYMENT_TYPES: TileOption[] = [
  { value: "MONTHLY_FEE", title: "Monthly fee", hint: "RM50 per month", icon: CalendarDays, tone: "text-[#1c7a33] bg-[#e2f7e1]" },
  { value: "SPECIAL_COLLECTION", title: "Special collection", hint: "One-off, e.g. Raya guard", icon: Sparkles, tone: "text-[#8a6300] bg-[#fff4d6]" },
];

const PAYMENT_METHODS: TileOption[] = [
  { value: "BANK_TRANSFER", title: "Bank transfer", hint: "Online / ATM transfer", icon: Landmark, tone: "text-[#0b6e8e] bg-[#ddf5fd]" },
  { value: "DUITNOW_QR", title: "DuitNow / QR", hint: "Scanned QR code", icon: QrCode, tone: "text-[#5d6779] bg-[#eef0f4]" },
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

function TileGroup({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: TileOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const selected = value === o.value;
        const Icon = o.icon;
        return (
          <label
            key={o.value}
            className={`relative flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition ${
              selected ? "bg-white ring-2 ring-[var(--blue)] shadow-[0_6px_20px_-10px_rgba(36,99,232,0.5)]" : "bg-[var(--paper)] ring-transparent hover:ring-black/10"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} className="sr-only" required />
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${o.tone}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--ink)]">{o.title}</span>
              <span className="block text-xs text-[var(--ink-2)]">{o.hint}</span>
            </span>
            {selected && (
              <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[var(--blue)] text-white">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export function PaymentForm({ residents, specialCollections, selectedResidentId }: PaymentFormProps) {
  const now = new Date();
  const [state, action, pending] = useActionState(createPayment, initialState);
  const [isPeeking, startPeek] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const [paymentType,   setPaymentType]   = useState("MONTHLY_FEE");
  const [residentId,    setResidentId]    = useState(selectedResidentId ?? "");
  const [snapshot,      setSnapshot]      = useState<ResidentSnapshot | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");

  const [startYear,  setStartYear]  = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear,    setEndYear]    = useState(now.getFullYear());
  const [endMonth,   setEndMonth]   = useState(now.getMonth() + 1);

  // Presentational state for the receipt preview.
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [paymentDate, setPaymentDate] = useState(now.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })) // local date, not UTC;
  const [typedAmount, setTypedAmount] = useState<{ forExpected: string; value: string } | null>(null);
  const [proof, setProof] = useState<{ url: string | null; name: string } | null>(null);

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

  useEffect(() => () => void (proof?.url && URL.revokeObjectURL(proof.url)), [proof]);

  const months = monthCount(startYear, startMonth, endYear, endMonth);
  const coverageLabel =
    months === 0
      ? "Check the months"
      : startYear === endYear
        ? startMonth === endMonth
          ? `${MONTH_LABELS[startMonth - 1]} ${startYear}`
          : `${MONTH_LABELS[startMonth - 1]} – ${MONTH_LABELS[endMonth - 1]} ${endYear}`
        : `${MONTH_LABELS[startMonth - 1]} ${startYear} – ${MONTH_LABELS[endMonth - 1]} ${endYear}`;
  const resident = residents.find((r) => r.id === residentId);
  const collection = specialCollections.find((c) => c.id === selectedCollectionId);
  const amountShown = typedAmount?.forExpected === expectedAmount ? typedAmount.value : expectedAmount;
  const amountNumber = Number(amountShown) || 0;

  const clearProof = () => {
    setProof(null);
    if (proofRef.current) proofRef.current.value = "";
  };

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
              <h3 className="font-heading text-base font-bold text-[var(--ink)]">Unable to record payment</h3>
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

      <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="grid gap-6">
          {/* Resident */}
          <section className="ui-card grid gap-4 p-6">
            <div>
              <h2 className="ui-section-title">Resident</h2>
              <p className="ui-hint mt-0.5">Search by house number or name.</p>
            </div>
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
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[image:var(--blend)] font-heading text-lg font-extrabold text-[#06210b]">
                    {snapshot.unitNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--ink)]">{snapshot.name}</p>
                    <p className="ui-hint">
                      {snapshot.latestCoverage
                        ? `Last paid: ${MONTH_LABELS[snapshot.latestCoverage.month - 1]} ${snapshot.latestCoverage.year}`
                        : "No payments recorded"}
                    </p>
                  </div>
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

          {/* What it's for */}
          <section className="ui-card grid gap-5 p-6">
            <div>
              <h2 className="ui-section-title">What is it for?</h2>
              <p className="ui-hint mt-0.5">Monthly fees cover months; special collections are one-off.</p>
            </div>
            <TileGroup name="paymentType" label="Payment type" options={PAYMENT_TYPES} value={paymentType} onChange={setPaymentType} />

            {!isSpecialCollection ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="ui-label">
                    From
                    <SearchableDropdown
                      name="coverageStartMonth"
                      options={MONTH_OPTIONS}
                      value={String(startMonth)}
                      onChange={(v) => setStartMonth(Number(v))}
                      required
                    />
                  </div>
                  <label className="ui-label">
                    Year
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      name="coverageStartYear"
                      onChange={(e) => setStartYear(Number(e.target.value))}
                      required
                      type="number"
                      value={startYear}
                    />
                  </label>
                  <div className="ui-label">
                    To
                    <SearchableDropdown
                      name="coverageEndMonth"
                      options={MONTH_OPTIONS}
                      value={String(endMonth)}
                      onChange={(v) => setEndMonth(Number(v))}
                      required
                    />
                  </div>
                  <label className="ui-label">
                    Year
                    <input
                      className="ui-input"
                      inputMode="numeric"
                      name="coverageEndYear"
                      onChange={(e) => setEndYear(Number(e.target.value))}
                      required
                      type="number"
                      value={endYear}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <input type="hidden" name="coverageStartMonth" value={now.getMonth() + 1} />
                <input type="hidden" name="coverageStartYear"  value={now.getFullYear()} />
                <input type="hidden" name="coverageEndMonth"   value={now.getMonth() + 1} />
                <input type="hidden" name="coverageEndYear"    value={now.getFullYear()} />
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
                {selectedCollectionId && snapshot && (() => {
                  const col = snapshot.assignedCollections.find((c) => c.id === selectedCollectionId);
                  if (!col) return null;
                  return (
                    <div className="rounded-2xl bg-[#ddf5fd] px-4 py-3 text-sm">
                      <span className="text-[var(--ink-2)]">Outstanding for this resident: </span>
                      <span className="font-semibold tabular-nums text-[#0b6e8e]">RM{(col.outstanding / 100).toFixed(2)}</span>
                    </div>
                  );
                })()}
              </>
            )}

            <div className="grid gap-1 rounded-2xl bg-[var(--paper)] p-5 text-center">
              <p className="text-sm text-[var(--ink-2)]">
                {isSpecialCollection
                  ? collection ? collection.title : "Pick a collection"
                  : months > 0 ? `${months} month${months !== 1 ? "s" : ""} · ${coverageLabel}` : "End month is before start month"}
              </p>
              <p className="text-blend font-heading text-5xl font-extrabold tracking-tight tabular-nums">
                RM{expectedAmount || "0.00"}
              </p>
              <p className="text-xs text-[var(--ink-2)]">Expected amount</p>
            </div>
          </section>

          {/* Amount & method */}
          <section className="ui-card grid gap-4 p-6">
            <h2 className="ui-section-title">Payment</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="ui-label">
                Amount received
                <span className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-heading text-lg font-bold text-[var(--ink-2)]">RM</span>
                  <input
                    className="ui-input !py-3 !pl-14 font-heading !text-lg font-bold tabular-nums"
                    defaultValue={expectedAmount}
                    key={expectedAmount}
                    inputMode="decimal"
                    min="1"
                    name="amount"
                    onChange={(e) => setTypedAmount({ forExpected: expectedAmount, value: e.target.value })}
                    required
                    step="0.01"
                    type="number"
                  />
                </span>
              </label>
              <label className="ui-label">
                Payment date
                <input
                  className="ui-input !py-3"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  name="paymentDate"
                  required
                  type="date"
                />
              </label>
            </div>

            {!isSpecialCollection && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[var(--paper)] p-3.5 text-sm text-[var(--ink)]">
                <input className="mt-0.5 size-4" name="allowAdjustment" type="checkbox" />
                <span>
                  <span className="block font-medium">Allow adjusted amount</span>
                  <span className="block text-xs text-[var(--ink-2)]">Tick when the payment doesn&apos;t exactly match RM50 per month.</span>
                </span>
              </label>
            )}

            <div className="grid gap-2">
              <p className="ui-label">Method</p>
              <TileGroup name="method" label="Payment method" options={PAYMENT_METHODS} value={method} onChange={setMethod} />
            </div>

            <label className="ui-label">
              <span>Reference number <span className="font-normal text-[var(--ink-2)]">(optional)</span></span>
              <input className="ui-input" name="referenceNo" placeholder="e.g. TXN123456" autoComplete="off" />
            </label>
          </section>

          {/* Proof & notes */}
          <section className="ui-card grid gap-4 p-6">
            <div>
              <h2 className="ui-section-title">Proof &amp; notes</h2>
              <p className="ui-hint mt-0.5">Optional, but a receipt makes audits painless.</p>
            </div>
            <div className="grid gap-2">
              <label className="grid min-h-36 cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed border-[#d2d2d7] bg-[var(--paper)] p-6 text-center transition hover:border-[var(--cyan)] hover:bg-white">
                {proof?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={proof.url} alt="Selected receipt" className="max-h-56 rounded-xl" />
                ) : proof ? (
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <FileText size={18} aria-hidden="true" /> {proof.name}
                  </span>
                ) : (
                  <>
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#ddf5fd] text-[#0b6e8e]">
                      <ImageUp size={22} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-[var(--ink)]">Tap to attach the receipt</span>
                  </>
                )}
                <span className="text-xs text-[var(--ink-2)]">PDF, JPG, PNG or WebP · max 10 MB</span>
                <input
                  ref={proofRef}
                  type="file"
                  name="proofFile"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setProof(file ? { url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, name: file.name } : null);
                  }}
                />
              </label>
              {proof && (
                <button type="button" onClick={clearProof} className="flex min-h-10 items-center gap-1.5 justify-self-start rounded-full px-3 text-sm font-medium text-[#c2341a] hover:bg-[#ffe6e0]">
                  <X size={14} aria-hidden="true" /> Remove {proof.name}
                </button>
              )}
            </div>
            <label className="ui-label">
              <span>Notes <span className="font-normal text-[var(--ink-2)]">(optional)</span></span>
              <textarea className="ui-textarea min-h-20" name="notes" />
            </label>
          </section>

          {state.message && state.ok && (
            <div className="ui-alert-success flex items-center gap-3">
              <CheckCircle size={16} />
              <p>{state.message}</p>
            </div>
          )}

          {/* Sticky save bar (sits above the mobile tab bar) */}
          <div className="sticky bottom-[76px] z-10 flex items-center justify-end gap-2 rounded-[22px] bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4">
            <Link href="/payments" className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5">
              Cancel
            </Link>
            <button className="ui-button-primary min-w-40" disabled={pending || residents.length === 0} type="submit">
              {pending ? "Recording…" : "Record payment"}
            </button>
          </div>
        </div>

        {/* Live receipt */}
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white">
            <div aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,0.35),transparent_70%)]" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#8e9ab8]">Receipt preview</p>
            <div className="mt-4 flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[image:var(--blend)] font-heading text-2xl font-extrabold text-[#06210b]">
                {resident?.unitNumber ?? "–"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-heading text-lg font-bold">{resident?.name ?? "Pick a resident"}</p>
                <p className="text-sm text-[#c7cedd]">{isSpecialCollection ? "Special collection" : "Monthly fee"}</p>
              </div>
            </div>
            <p className="mt-5 font-heading text-4xl font-extrabold tracking-tight tabular-nums">RM{amountNumber.toFixed(2)}</p>
            {expectedAmount && amountNumber > 0 && Number(expectedAmount) !== amountNumber && (
              <p className="mt-1 text-xs text-[#ffd479]">Expected RM{expectedAmount}</p>
            )}
            <dl className="mt-4 grid gap-2 border-t border-dashed border-white/15 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">{isSpecialCollection ? "Collection" : "Months"}</dt>
                <dd className="truncate text-right font-semibold">
                  {isSpecialCollection ? (collection?.title ?? "—") : months > 0 ? `${coverageLabel} (${months})` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">Method</dt>
                <dd className="font-semibold">{PAYMENT_METHODS.find((m) => m.value === method)?.title}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">Paid on</dt>
                <dd className="font-semibold tabular-nums">{paymentDate || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">Proof</dt>
                <dd className="font-semibold">{proof ? "Attached" : "None"}</dd>
              </div>
            </dl>
          </div>
          <div className="hidden justify-items-center rounded-[28px] bg-white p-5 ring-1 ring-black/5 lg:grid">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
            <img src="/art/a4-submit-success.webp" alt="" width={300} height={225} className="animate-float w-48" />
          </div>
        </aside>
      </form>
    </>
  );
}
