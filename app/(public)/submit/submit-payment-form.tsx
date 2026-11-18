"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, FileText } from "lucide-react";

import { createPublicSubmission, type PublicSubmissionState } from "@/lib/actions/public-submissions";
import { DEFAULT_MONTHLY_FEE_SEN, formatRM } from "@/lib/money";
import { useDictionary } from "@/lib/i18n/context";
import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { fill } from "@/lib/text";

export type SubmitHouse = {
  unit: string;
  name: string;
  paidUntil: string | null;
  nextYear: number;
  nextMonth: number;
  /** Months ("2026-5") that already have a receipt waiting for review. */
  pending: string[];
  /** Months ("2026-5") already paid in full. */
  paid: string[];
  /** Months ("2026-5") with part of the fee already in, and how much (sen). */
  partial: Record<string, number>;
};
type SpecialCollection = { id: string; title: string; amountPerResident: number };
type Bank = { name: string; holder: string; account: string };

const initialState: PublicSubmissionState = { ok: false, message: "" };

function addMonths(year: number, month: number, n: number) {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function SubmitPaymentForm({
  houses,
  initialUnit,
  initialCount = 1,
  specialCollections,
  outstandingByUnit,
  bank,
}: {
  houses: SubmitHouse[];
  initialUnit: string;
  initialCount?: number;
  specialCollections: SpecialCollection[];
  outstandingByUnit: Record<string, Record<string, number>>;
  bank: Bank;
}) {
  const [state, action, pending] = useActionState(createPublicSubmission, initialState);
  const { t, locale } = useDictionary();
  const f = t.submitFlow;
  const turnstileRef = useRef<TurnstileHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState(initialUnit);
  const [paymentType, setPaymentType] = useState<"MONTHLY_FEE" | "SPECIAL_COLLECTION">("MONTHLY_FEE");
  const [count, setCount] = useState(initialCount);
  const [otherAmount, setOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [collectionId, setCollectionId] = useState(specialCollections[0]?.id ?? "");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [preview, setPreview] = useState<{ url: string | null; name: string } | null>(null);
  const [error, setError] = useState("");

  const house = houses.find((h) => h.unit === unit.trim());
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { month: "short", year: "2-digit" }), [locale]);
  const label = (ym: { year: number; month: number }) => monthFmt.format(new Date(ym.year, ym.month - 1, 1));

  // Months with a receipt already waiting for review cannot be paid again: the choice starts at the first free
  // month and stops before the next one that is under review.
  const pendingMonths = new Set(house?.pending ?? []);
  const paidMonths = new Set(house?.paid ?? []);
  const underReview = (m: { year: number; month: number }) => pendingMonths.has(`${m.year}-${m.month}`);
  const taken = (m: { year: number; month: number }) => underReview(m) || paidMonths.has(`${m.year}-${m.month}`);
  const offered = house ? Array.from({ length: 36 }, (_, i) => addMonths(house.nextYear, house.nextMonth, i)) : [];
  const skip = Math.max(0, offered.findIndex((m) => !taken(m)));
  const chips = offered.slice(0, skip + 12);
  let room = 0;
  while (skip + room < chips.length && !taken(chips[skip + room])) room += 1;
  const months = Math.max(1, Math.min(count, room));
  const start = house ? chips[skip] : null;
  const end = start ? addMonths(start.year, start.month, months - 1) : null;
  const untilDecember = start ? Math.min(12 - start.month + 1, room) : 1;
  const waiting = chips.slice(0, skip).filter(underReview);
  // Only collections this house still owes, priced at its remaining balance.
  const owed = house ? (outstandingByUnit[house.unit] ?? {}) : {};
  const houseCollections = specialCollections
    .filter((c) => (owed[c.id] ?? 0) > 0)
    .map((c) => ({ ...c, outstanding: owed[c.id] }));
  const collection = houseCollections.find((c) => c.id === collectionId) ?? houseCollections[0];

  const amountSen =
    otherAmount
      ? Math.round((Number(customAmount) || 0) * 100)
      : paymentType === "SPECIAL_COLLECTION"
        ? collection?.outstanding ?? 0
        : chips.slice(skip, skip + months).reduce((sum, m) => sum + DEFAULT_MONTHLY_FEE_SEN - (house?.partial[`${m.year}-${m.month}`] ?? 0), 0);

  useEffect(() => {
    if (state.message && !state.ok) turnstileRef.current?.reset();
  }, [state]);

  useEffect(() => () => void (preview?.url && URL.revokeObjectURL(preview.url)), [preview]);

  // Moving to another step: if the person had scrolled down, bring the top of the form (the new step's first field) back into view.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const top = formRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) formRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const goNext = () => {
    if (step === 1 && !house) return setError(f.houseUnknown);
    if (step === 2 && (amountSen <= 0 || !paymentDate || (paymentType === "SPECIAL_COLLECTION" && !collection))) return setError(f.fixFirst);
    setError("");
    setStep((s) => s + 1);
  };

  if (state.ok) {
    const ref = state.reference ?? "";
    const share = `https://wa.me/?text=${encodeURIComponent(fill(f.shareText, { unit, ref }))}`;
    return (
      <div className="grid justify-items-center gap-4 rounded-[28px] bg-white p-8 text-center ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- static decorative art */}
        <img src="/art/a4-submit-success.webp" alt="" width={300} height={225} className="w-60" />
        <h2 className="font-heading text-3xl font-bold tracking-tight">{f.doneTitle}</h2>
        {ref && (
          <p className="rounded-full bg-[var(--paper)] px-4 py-1.5 text-sm">
            {f.doneRef} <strong className="font-heading tracking-wider">{ref}</strong>
          </p>
        )}
        <p className="max-w-sm text-[var(--ink-2)]">{f.doneBody}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <a href={share} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25d366] px-5 py-2.5 font-semibold text-white">
            {f.share}
          </a>
          <a href={`/rumah/${encodeURIComponent(unit)}`} className="rounded-full px-5 py-2.5 font-semibold text-[var(--blue)] ring-1 ring-black/10">
            {f.viewHouse}
          </a>
        </div>
        <a href="/submit" className="text-sm text-[var(--blue)] hover:underline">
          {f.another} ›
        </a>
      </div>
    );
  }

  const steps = [f.stepHouse, f.stepPayment, f.stepProof];
  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-[var(--ink)] text-white" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[#e8e8ed]"}`;

  return (
    <form ref={formRef} action={action} className="grid scroll-mt-20 gap-5 rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
      <input aria-hidden="true" className="hidden" name="website" tabIndex={-1} autoComplete="off" />
      <input type="hidden" name="unitNumber" value={unit.trim()} />
      <input type="hidden" name="residentName" value={house?.name ?? ""} />
      <input type="hidden" name="paymentType" value={paymentType} />
      <input type="hidden" name="method" value="BANK_TRANSFER" />
      <input type="hidden" name="amount" value={(amountSen / 100).toFixed(2)} />
      <input type="hidden" name="paymentDate" value={paymentDate} />
      <input type="hidden" name="specialCollectionId" value={paymentType === "SPECIAL_COLLECTION" ? (collection?.id ?? "") : ""} />
      {(() => {
        const now = new Date();
        const s = paymentType === "MONTHLY_FEE" && start ? start : { year: now.getFullYear(), month: now.getMonth() + 1 };
        const e = paymentType === "MONTHLY_FEE" && end ? end : s;
        return (
          <>
            <input type="hidden" name="coverageStartYear" value={s.year} />
            <input type="hidden" name="coverageStartMonth" value={s.month} />
            <input type="hidden" name="coverageEndYear" value={e.year} />
            <input type="hidden" name="coverageEndMonth" value={e.month} />
          </>
        );
      })()}

      {/* Step indicator */}
      <ol data-tour="submit-steps" className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {steps.map((name, i) => (
          <li key={name} className="grid gap-1.5" aria-current={step === i + 1 ? "step" : undefined}>
            <span className={`h-1 rounded-full ${step > i ? "bg-[image:var(--blend)]" : "bg-[#e8e8ed]"}`} />
            <span className={step === i + 1 ? "text-[var(--ink)]" : "text-[#aeaeb2]"}>
              {i + 1}. {name}
            </span>
          </li>
        ))}
      </ol>

      {/* Step 1: house */}
      <div data-tour="submit-house" hidden={step !== 1} className="grid gap-3">
        <label className="ui-label" htmlFor="unit">
          {f.houseLabel}
        </label>
        <input
          id="unit"
          list="house-list"
          inputMode="numeric"
          autoComplete="off"
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            setCount(1);
            setError("");
          }}
          className="ui-input font-heading !text-2xl font-bold"
          placeholder="12"
        />
        <datalist id="house-list">
          {houses.map((h) => (
            <option key={h.unit} value={h.unit}>
              {h.name}
            </option>
          ))}
        </datalist>
        {house && (
          <p className="rounded-2xl bg-[var(--paper)] px-4 py-3 text-sm">
            <strong>
              No. {house.unit} · {house.name}
            </strong>
            <br />
            <span className="text-[var(--ink-2)]">{house.paidUntil ? fill(f.paidUntil, { month: house.paidUntil }) : f.noPayment}</span>
          </p>
        )}
      </div>

      {/* Step 2: payment */}
      <div hidden={step !== 2} className="grid gap-5">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-[var(--paper)] p-1" role="group">
          {(["MONTHLY_FEE", "SPECIAL_COLLECTION"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={paymentType === type}
              onClick={() => setPaymentType(type)}
              className={`rounded-full py-2 text-sm font-semibold ${paymentType === type ? "bg-white shadow-sm" : "text-[var(--ink-2)]"}`}
            >
              {type === "MONTHLY_FEE" ? f.monthly : f.special}
            </button>
          ))}
        </div>

        {paymentType === "MONTHLY_FEE" ? (
          <div className="grid gap-3">
            <p className="text-sm font-semibold">{f.whichMonths}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(months === 1)} onClick={() => setCount(1)}>
                {f.quick1}
              </button>
              {room >= 3 && (
                <button type="button" className={chip(months === 3)} onClick={() => setCount(3)}>
                  {f.quick3}
                </button>
              )}
              {untilDecember > 3 && (
                <button type="button" className={chip(months === untilDecember)} onClick={() => setCount(untilDecember)}>
                  {f.quickDec}
                </button>
              )}
            </div>
            {waiting.length > 0 && (
              <p className="rounded-2xl bg-[#ddf5fd] px-4 py-3 text-sm text-[#0b6e8e]">
                {fill(f.pendingNote, { months: waiting.map(label).join(", "), next: start ? label(start) : "" })}
              </p>
            )}
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {chips.map((m, i) => {
                const review = underReview(m);
                const done = !review && paidMonths.has(`${m.year}-${m.month}`);
                const picked = !review && !done && i >= skip && i < skip + months;
                return (
                  <button
                    key={`${m.year}-${m.month}`}
                    type="button"
                    disabled={review || done}
                    aria-pressed={picked}
                    onClick={() => setCount(i - skip + 1)}
                    className={`flex h-12 flex-col items-center justify-center rounded-xl text-xs font-semibold leading-tight transition ${
                      review
                        ? "cursor-not-allowed bg-[#ddf5fd] text-[#0b6e8e]"
                        : done
                          ? "cursor-not-allowed bg-[#e2f7e1]/60 text-[#1c7a33]/70"
                          : picked
                          ? "bg-[#e2f7e1] text-[#1c7a33] ring-1 ring-inset ring-[var(--leaf)]"
                          : "bg-[var(--paper)] text-[var(--ink-2)]"
                    }`}
                  >
                    {label(m)}
                    {review && <span className="block text-[10px] font-medium">{f.underReview}</span>}
                    {done && <span className="block text-[10px] font-medium">{f.paidMonth}</span>}
                  </button>
                );
              })}
            </div>
            {start && end && (
              <p className="text-sm text-[var(--ink-2)]">{fill(f.monthsSelected, { n: months, from: label(start), to: label(end) })}</p>
            )}
          </div>
        ) : houseCollections.length ? (
          <div className="grid gap-2">
            {houseCollections.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ${
                  collection?.id === c.id ? "ring-2 ring-[var(--blue)]" : "ring-black/10"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input type="radio" name="collectionChoice" checked={collection?.id === c.id} onChange={() => setCollectionId(c.id)} />
                  <span className="font-semibold">{c.title}</span>
                </span>
                <span className="text-right text-sm text-[var(--ink-2)]">
                  {formatRM(c.outstanding)}
                  {c.outstanding < c.amountPerResident && (
                    <span className="block text-xs">{fill(f.balanceOf, { total: formatRM(c.amountPerResident) })}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-[#fff4d6] px-4 py-3 text-sm text-[#8a6300]">{specialCollections.length ? f.noSpecialForHouse : f.noSpecial}</p>
        )}

        <div className="grid gap-1 rounded-2xl bg-[var(--paper)] p-5 text-center">
          <p className="text-sm text-[var(--ink-2)]">{f.amountDue}</p>
          <p className="text-blend font-heading text-5xl font-extrabold tracking-tight">{formatRM(amountSen)}</p>
        </div>

        {(paymentType === "MONTHLY_FEE" || collection) && (
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={otherAmount} onChange={(e) => setOtherAmount(e.target.checked)} />
              {f.otherAmount}
            </label>
            {otherAmount && (
              <label className="ui-label">
                {f.amountLabel}
                <input
                  className="ui-input"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </label>
            )}
          </div>
        )}

        <label className="ui-label min-w-0">
          {f.paidOn}
          {/* iOS gives a date field its own minimum width; appearance-none + min-w-0 keeps it inside the card. */}
          <input className="ui-input block min-h-11 min-w-0 max-w-full appearance-none" type="date" value={paymentDate} max={new Date().toLocaleDateString("en-CA")} onChange={(e) => setPaymentDate(e.target.value)} />
        </label>

        <div className="rounded-2xl px-4 py-3 text-sm ring-1 ring-black/10">
          <p className="text-[var(--ink-2)]">{f.payTo}</p>
          <p className="font-semibold">
            {bank.name} · {bank.holder}
          </p>
          <p className="font-heading text-lg font-bold tracking-wide">{bank.account}</p>
          <p className="mt-1 text-xs text-[var(--ink-2)]">{t.home.reference.replace("12", unit.trim() || "12")}</p>
        </div>
      </div>

      {/* Step 3: proof */}
      <div hidden={step !== 3} className="grid gap-4">
        <label className="grid cursor-pointer justify-items-center gap-2 rounded-2xl border-2 border-dashed border-[#d2d2d7] p-6 text-center hover:border-[var(--cyan)]">
          {preview?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={preview.url} alt="" className="max-h-56 rounded-xl" />
          ) : preview ? (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FileText size={18} aria-hidden="true" /> {preview.name}
            </span>
          ) : (
            <span className="font-semibold">{f.proofLabel}</span>
          )}
          <span className="text-xs text-[var(--ink-2)]">{f.proofHint}</span>
          <input
            type="file"
            name="proofFile"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? { url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, name: file.name } : null);
            }}
          />
        </label>
        <label className="ui-label">
          {f.phone}
          <input className="ui-input" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </label>
        <label className="ui-label">
          {f.reference}
          <input className="ui-input" name="referenceNo" />
        </label>
        <label className="ui-label">
          {f.notes}
          <textarea className="ui-textarea" name="notes" rows={2} />
        </label>
        <TurnstileWidget ref={turnstileRef} />
      </div>

      {(error || (state.message && !state.ok)) && (
        <p role="alert" className="ui-alert-error flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error || state.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <button type="button" className="ui-button-secondary" onClick={() => (setError(""), setStep((s) => s - 1))}>
            {f.back}
          </button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <button type="button" className="ui-button-primary min-w-32" onClick={goNext}>
            {f.next}
          </button>
        ) : (
          <button type="submit" className="ui-button-primary min-w-32" disabled={pending}>
            {pending ? f.sending : (
              <>
                <Check size={16} aria-hidden="true" /> {f.send}
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
