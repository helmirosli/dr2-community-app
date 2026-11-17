import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleCheck, MessageCircle, Phone, TriangleAlert } from "lucide-react";

import { FileViewer } from "@/app/components/file-viewer";
import { formatDate } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locale";
import { DEFAULT_MONTHLY_FEE_SEN, formatRM, formatRMShort } from "@/lib/money";
import { telHref, whatsappHref } from "@/lib/phone";
import type { QueueItem, RecentDecision, ReviewData, ReviewItem } from "@/lib/reports/review-queue";
import { monthName } from "@/lib/status";
import { fill } from "@/lib/text";
import { ReviewActions } from "./review-actions";

type Item = Extract<ReviewData, { kind: "item" }>;
type Clear = Extract<ReviewData, { kind: "empty" }>;
type Actions = { approve: (formData: FormData) => Promise<void>; reject: (formData: FormData) => Promise<void> };

/** Raised, button-like edge for the house tiles. */
const RAISED = "shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_2px_0_rgba(0,0,0,.07)]";

// Same colours as the payment form: monthly fees green, special collections amber.
const TONE = { MONTHLY_FEE: "bg-[#e2f7e1] text-[#1c7a33]", SPECIAL_COLLECTION: "bg-[#fff4d6] text-[#8a6300]" } as const;

const ageLabel = (r: Dictionary["reviewInbox"], days: number) => (days < 1 ? r.today : fill(r.age, { n: days }));

function typeLabel(t: Dictionary, type: QueueItem["type"], title: string | null) {
  return type === "MONTHLY_FEE" ? t.dashboard.monthlyFee : (title ?? t.payments.specialCollection);
}

/** "Jul – Nov 2026 · 5 months" */
function monthsLabel(t: Dictionary, locale: Locale, months: { year: number; month: number }[]) {
  if (months.length === 0) return "—";
  const first = months[0];
  const last = months[months.length - 1];
  const short = (m: { year: number; month: number }) => monthName(locale, m.year, m.month, "short");
  const range =
    first.year === last.year && first.month === last.month
      ? `${short(first)} ${first.year}`
      : first.year === last.year
        ? `${short(first)} – ${short(last)} ${first.year}`
        : `${short(first)} ${first.year} – ${short(last)} ${last.year}`;
  return `${range} · ${months.length === 1 ? t.payments.monthsCountOne : fill(t.payments.monthsCount, { n: months.length })}`;
}

function QueuePanel({ t, data }: { t: Dictionary; data: Item }) {
  const r = t.reviewInbox;
  const current = data.queue[data.index];
  return (
    <aside className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
      <h1 className="mb-3 font-heading text-xl font-bold">
        {r.title} <span className="text-sm font-medium text-[var(--ink-2)]">· {fill(r.count, { n: data.queue.length })}</span>
      </h1>
      <ul className="grid gap-1.5">
        {data.queue.map((s) => {
          const active = s.id === current.id;
          return (
            <li key={s.id}>
              <Link
                href={`/review?id=${s.id}`}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-3 rounded-2xl p-3 text-sm transition ${active ? "bg-white shadow-sm ring-2 ring-[var(--cyan)]" : "hover:bg-white"}`}
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl font-heading text-sm font-bold tabular-nums ${TONE[s.type]} ${RAISED}`}>{s.unit}</span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{s.name || "—"}</span>
                    <span className="shrink-0 font-heading font-bold tabular-nums">{formatRMShort(s.amountSen)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 text-xs text-[var(--ink-2)]">
                    <span className="truncate">{typeLabel(t, s.type, s.collectionTitle)}</span>
                    <span className={`shrink-0 ${s.ageDays >= 3 ? "font-semibold text-[#8a6300]" : ""}`}>{ageLabel(r, s.ageDays)}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** Phones: the queue as a strip you can swipe through. */
function QueueStrip({ t, data }: { t: Dictionary; data: Item }) {
  const r = t.reviewInbox;
  const current = data.queue[data.index];
  return (
    <div className="grid gap-3 lg:hidden">
      <h1 className="font-heading text-xl font-bold">
        {r.title} <span className="text-sm font-medium text-[var(--ink-2)]">· {fill(r.count, { n: data.queue.length })}</span>
      </h1>
      {data.queue.length > 1 && (
        <nav aria-label={r.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {data.queue.map((s) => (
            <Link
              key={s.id}
              href={`/review?id=${s.id}`}
              aria-current={s.id === current.id ? "true" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-2xl bg-white p-2 pr-3 text-sm shadow-sm ${s.id === current.id ? "ring-2 ring-[var(--cyan)]" : "ring-1 ring-black/5"}`}
            >
              <span className={`grid size-9 place-items-center rounded-lg font-heading text-xs font-bold tabular-nums ${TONE[s.type]}`}>{s.unit}</span>
              <span className="font-heading font-bold tabular-nums">{formatRMShort(s.amountSen)}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function Header({ t, item, data }: { t: Dictionary; item: ReviewItem; data: Item }) {
  const r = t.reviewInbox;
  const tel = telHref(item.phone);
  const wa = whatsappHref(item.phone);
  const n = data.queue.length;
  const prev = data.queue[(data.index - 1 + n) % n];
  const next = data.queue[(data.index + 1) % n];

  return (
    <div className="ui-card flex flex-wrap items-center gap-4 p-4 sm:p-5">
      {item.residentId ? (
        <Link
          href={`/residents/${item.residentId}`}
          aria-label={`${r.openProfile}: ${item.name}`}
          title={r.openProfile}
          className={`grid size-14 shrink-0 place-items-center rounded-2xl font-heading text-xl font-bold tabular-nums transition hover:scale-105 ${TONE[item.type]} ${RAISED}`}
        >
          {item.unit}
        </Link>
      ) : (
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl font-heading text-xl font-bold tabular-nums ${TONE[item.type]} ${RAISED}`}>{item.unit}</span>
      )}
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="truncate font-heading text-2xl font-bold leading-tight">{item.name || "—"}</h2>
        <p className="text-sm text-[var(--ink-2)]">
          {typeLabel(t, item.type, item.collectionTitle)} · {fill(r.submittedWhen, { when: ageLabel(r, item.ageDays) })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {tel && (
          <a href={tel} aria-label={`${t.residents.call}: ${item.name}`} title={t.residents.call} className="grid size-10 place-items-center rounded-full bg-[var(--paper)] text-[var(--ink-2)] ring-1 ring-black/5 transition hover:bg-white hover:text-[var(--ink)] hover:shadow-sm">
            <Phone size={16} aria-hidden="true" />
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`${t.residents.whatsapp}: ${item.name}`} title={t.residents.whatsapp} className="grid size-10 place-items-center rounded-full bg-[#e7f9ee] text-[#128c4a] transition hover:brightness-95">
            <MessageCircle size={16} aria-hidden="true" />
          </a>
        )}
        {item.residentId && (
          <Link href={`/residents/${item.residentId}`} className="hidden h-10 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-[var(--blue)] hover:bg-black/5 sm:inline-flex">
            {r.openProfile}
          </Link>
        )}
        {n > 1 && (
          <div className="flex items-center gap-0.5 rounded-full bg-[var(--paper)] p-1 text-sm text-[var(--ink-2)]">
            <Link aria-label={r.previous} href={`/review?id=${prev.id}`} className="grid size-8 place-items-center rounded-full hover:bg-white">
              <ChevronLeft size={16} />
            </Link>
            <span className="whitespace-nowrap px-1 tabular-nums">{fill(r.of, { i: data.index + 1, n })}</span>
            <Link aria-label={r.next} href={`/review?id=${next.id}`} className="grid size-8 place-items-center rounded-full hover:bg-white">
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** The decision aid: what they claim, what is expected, and the checks, with a one-line verdict. */
function Comparison({ t, locale, item }: { t: Dictionary; locale: Locale; item: ReviewItem }) {
  const r = t.reviewInbox;
  const isMonthly = item.type === "MONTHLY_FEE";
  const hasProof = item.uploads.length > 0;
  const mon = (m: { year: number; month: number }) => `${monthName(locale, m.year, m.month)} ${m.year}`;

  const checks: { key: string; ok: boolean; text: string }[] = [
    {
      key: "amount",
      ok: item.diffSen === 0,
      text: item.diffSen === 0 ? r.matches : fill(r.differs, { diff: `${item.diffSen > 0 ? "+" : "−"}${formatRM(Math.abs(item.diffSen))}` }),
    },
  ];
  if (isMonthly) checks.push({ key: "overlap", ok: !item.overlap, text: item.overlap ? fill(r.overlap, { month: mon(item.overlap) }) : r.noOverlap });
  if (!hasProof) checks.push({ key: "file", ok: false, text: r.noProof });
  else if (item.fileChecked) checks.push({ key: "file", ok: !item.duplicateFile, text: item.duplicateFile ? r.dupFile : r.noDupFile });

  const failing = checks.filter((c) => !c.ok).length;
  const good = failing === 0;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10 sm:p-7">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.24),transparent_70%)]" />
      <span aria-hidden="true" className={`pointer-events-none absolute -bottom-28 left-6 -z-10 size-64 rounded-full ${good ? "bg-[radial-gradient(circle,rgba(142,229,63,.2),transparent_70%)]" : "bg-[radial-gradient(circle,rgba(245,180,0,.18),transparent_70%)]"}`} />

      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${good ? "bg-[#1c3a2a] text-[var(--lime)]" : "bg-[#3a3010] text-[#f5b400]"}`}>
        {good ? <CircleCheck size={22} className="mt-0.5 shrink-0" aria-hidden="true" /> : <TriangleAlert size={22} className="mt-0.5 shrink-0" aria-hidden="true" />}
        <div className="grid gap-0.5">
          <p className="font-heading text-base font-bold leading-tight">{good ? r.looksGood : r.checkFirst}</p>
          <p className="text-sm opacity-80">{good ? fill(r.allChecksPassed, { n: checks.length }) : fill(r.checksNeedLook, { n: failing, total: checks.length })}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="grid content-start gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8e9ab8]">{r.claim}</p>
          <p className="font-heading text-[clamp(1.9rem,4.5vw,2.9rem)] font-extrabold leading-none tracking-tight tabular-nums">
            <span className="text-blend">{formatRMShort(item.amountSen)}</span>
          </p>
          <p className="text-sm text-[#c7cedd]">{isMonthly ? monthsLabel(t, locale, item.months) : (item.collectionTitle ?? "—")}</p>
        </div>
        <div className="grid content-start gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8e9ab8]">{r.expectedShort}</p>
          <p className={`font-heading text-[clamp(1.9rem,4.5vw,2.9rem)] font-extrabold leading-none tracking-tight tabular-nums ${item.diffSen === 0 ? "text-white" : "text-[#f5b400]"}`}>{formatRMShort(item.expectedSen)}</p>
          <p className="text-sm text-[#c7cedd]">
            {isMonthly ? (
              <>
                {item.months.length} × {formatRMShort(DEFAULT_MONTHLY_FEE_SEN)} · {r.paidUntil}{" "}
                <strong className="font-semibold text-white">{item.paidUntil ? monthName(locale, item.paidUntil.year, item.paidUntil.month, "long") : "—"}</strong>
              </>
            ) : item.assignment ? (
              <>
                {r.expectedBalance} · {fill(r.alreadyPaid, { paid: formatRMShort(item.assignment.paidSen), due: formatRMShort(item.assignment.dueSen) })}
              </>
            ) : (
              r.expectedBalance
            )}
          </p>
        </div>
      </div>

      <ul className="mt-6 grid gap-2">
        {checks.map((c) => (
          <li key={c.key} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ${c.ok ? "bg-[#1c3a2a]/80 text-[var(--lime)]" : "bg-[#3a3010] text-[#f5b400]"}`}>
            {c.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
            {c.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Receipt({ t, item }: { t: Dictionary; item: ReviewItem }) {
  const r = t.reviewInbox;
  const proof = item.uploads[0];
  if (!proof) {
    return (
      <div className="grid content-center justify-items-center gap-3 rounded-[28px] border border-dashed border-[#f0d58a] bg-[#fffbf0] px-6 py-12 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
        <img src="/art/no-receipt.webp" alt="" width={160} height={160} className="animate-float size-36 rounded-[28px] shadow-[0_18px_40px_-18px_rgba(138,99,0,0.45)]" />
        <div className="grid gap-1">
          <p className="font-heading text-lg font-bold text-[var(--ink)]">{r.noProof}</p>
          <p className="mx-auto max-w-xs text-sm text-[var(--ink-2)]">{r.noProofHint}</p>
        </div>
      </div>
    );
  }
  const src = proof.url ?? `/api/uploads/${proof.storagePath}`;
  return (
    <div className="grid gap-3 rounded-[28px] bg-[var(--night)] p-3 shadow-[0_30px_60px_-30px_rgba(5,10,26,.7)] ring-1 ring-white/10">
      <div className="grid min-h-80 place-items-center overflow-hidden rounded-2xl bg-black/30 p-2">
        {proof.mimeType === "application/pdf" ? (
          <iframe src={src} title={proof.originalFilename} className="h-[520px] w-full rounded-xl bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- private upload served by /api/uploads
          <img src={src} alt={proof.originalFilename} className="max-h-[560px] w-auto max-w-full rounded-xl object-contain" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-2 pb-1">
        <p className="min-w-0 truncate text-xs text-[#a1a1a6]">{proof.originalFilename}</p>
        <FileViewer files={item.uploads} triggerLabel={r.openFile} />
      </div>
    </div>
  );
}

function Details({ t, locale, item }: { t: Dictionary; locale: Locale; item: ReviewItem }) {
  const r = t.reviewInbox;
  const isMonthly = item.type === "MONTHLY_FEE";
  const method = t.payments.methods[item.method as keyof typeof t.payments.methods] ?? item.method;
  const rows: [string, React.ReactNode][] = [
    [isMonthly ? r.months : r.collection, isMonthly ? monthsLabel(t, locale, item.months) : (item.collectionTitle ?? "—")],
    [r.paidOn, formatDate(item.paymentDate, locale)],
    [r.method, method],
  ];
  if (item.referenceNo) rows.push([r.reference, <span key="ref" className="break-all">{item.referenceNo}</span>]);
  if (item.phone) rows.push([r.phone, item.phone]);
  if (item.notes) rows.push([r.notes, <span key="notes" className="font-normal">{item.notes}</span>]);

  return (
    <div className="ui-card p-5">
      <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[var(--ink-2)]">{label}</dt>
            <dd className="min-w-0 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ClearState({ t, locale, data }: { t: Dictionary; locale: Locale; data: Clear }) {
  const r = t.reviewInbox;
  const when = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-10 sm:py-16">
      <section className="ui-card grid justify-items-center gap-4 px-6 py-12 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
        <img src="/art/a3-inbox-clear.webp" alt="" width={300} height={225} className="animate-float w-64 mix-blend-multiply [mask-image:radial-gradient(closest-side,#000_70%,transparent)]" />
        <h1 className="font-heading text-2xl font-bold">{r.empty}</h1>
        <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold">
          <span className="text-[var(--ink-2)]">{r.reviewedToday}:</span>
          {data.approvedToday + data.rejectedToday === 0 ? (
            <span className="text-[var(--ink-2)] font-normal">{r.nothingToday}</span>
          ) : (
            <>
              <span className="ui-chip bg-[#e2f7e1] text-[#1c7a33]">{fill(r.approvedN, { n: data.approvedToday })}</span>
              {data.rejectedToday > 0 && <span className="ui-chip bg-[#ffe6e0] text-[#c2341a]">{fill(r.rejectedN, { n: data.rejectedToday })}</span>}
            </>
          )}
        </div>
        <Link href="/dashboard" className="ui-button-secondary mt-1">
          {t.today.title} <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {data.recent.length > 0 && (
        <section className="ui-card overflow-hidden">
          <h2 className="ui-section-title px-5 pt-5">{r.recent}</h2>
          <ul className="mt-3 divide-y divide-black/5">
            {data.recent.map((d: RecentDecision) => {
              const approved = d.status === "APPROVED";
              return (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl font-heading text-sm font-bold tabular-nums ${approved ? "bg-[#e2f7e1] text-[#1c7a33]" : "bg-[#ffe6e0] text-[#c2341a]"} ${RAISED}`}>{d.unit}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-semibold">{d.name || "—"}</span>
                      <span className={`ui-chip ${approved ? "bg-[#e2f7e1] text-[#1c7a33]" : "bg-[#ffe6e0] text-[#c2341a]"}`}>{approved ? r.approvedChip : r.rejectedChip}</span>
                    </p>
                    <p className="truncate text-xs text-[var(--ink-2)]">{d.reviewedAt ? when.format(d.reviewedAt) : ""}{d.reason && !approved ? ` · ${d.reason}` : ""}</p>
                  </div>
                  <p className="font-heading font-bold tabular-nums">{formatRMShort(d.amountSen)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

export function ReviewView({ t, locale, data, actions }: { t: Dictionary; locale: Locale; data: ReviewData; actions: Actions }) {
  if (data.kind === "empty") return <ClearState t={t} locale={locale} data={data} />;

  const r = t.reviewInbox;
  const item = data.item;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
      <QueuePanel t={t} data={data} />

      <section className="grid min-w-0 content-start gap-4">
        <QueueStrip t={t} data={data} />
        <Header t={t} item={item} data={data} />

        {/* Decision first on phones; on wide screens the receipt takes the left column. */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="min-w-0 xl:col-start-2 xl:row-start-1">
            <Comparison t={t} locale={locale} item={item} />
          </div>
          <div className="grid min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1 [&>*]:h-full">
            <Receipt t={t} item={item} />
          </div>
          <div className="min-w-0 xl:col-start-2 xl:row-start-2">
            <Details t={t} locale={locale} item={item} />
          </div>
        </div>

        <ReviewActions
          key={item.id}
          approve={actions.approve}
          reject={actions.reject}
          labels={{ approve: r.approveNext, reject: r.rejectNext, reason: r.reason, confirmReject: r.confirmReject, cancel: r.cancel }}
        />
      </section>
    </main>
  );
}
