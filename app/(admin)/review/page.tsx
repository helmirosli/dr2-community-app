import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { FileViewer } from "@/app/components/file-viewer";
import { approveSubmission, rejectSubmission } from "@/lib/actions/review-submissions";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN, formatRM } from "@/lib/money";
import { expandMonthRange } from "@/lib/months";
import { findExistingOfficialCoverageByUnitNumber } from "@/lib/payments/duplicates";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { monthName } from "@/lib/status";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireDashboardUser();
  const [{ id }, t, locale] = await Promise.all([searchParams, getDictionary(), getLocale()]);
  const r = t.reviewInbox;

  const queue = await prisma.publicPaymentSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      uploads: { select: { id: true, originalFilename: true, storagePath: true, mimeType: true, url: true, contentHash: true } },
      specialCollection: { select: { title: true, amountPerResident: true } },
    },
  });

  if (queue.length === 0) {
    return (
      <main className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-20 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static decorative art */}
        <img src="/art/a3-inbox-clear.webp" alt="" width={300} height={225} className="w-64 rounded-3xl" />
        <h1 className="font-heading text-2xl font-bold">{r.empty}</h1>
        <Link href="/dashboard" className="text-[var(--blue)] hover:underline">
          {t.today.title} ›
        </Link>
      </main>
    );
  }

  const index = Math.max(0, queue.findIndex((s) => s.id === id));
  const item = queue[index];
  const nowDate = new Date();
  const now = nowDate.getTime();
  const ageLabel = (d: Date) => {
    const days = Math.floor((now - d.getTime()) / 86_400_000);
    return days < 1 ? r.today : fill(r.age, { n: days });
  };

  const isMonthly = item.paymentType === "MONTHLY_FEE";
  const months = isMonthly ? expandMonthRange(item.coverageStartYear, item.coverageStartMonth, item.coverageEndYear, item.coverageEndMonth) : [];
  // Special collections: expect what this house still owes (due − already paid), not the full per-house amount.
  const assignment =
    !isMonthly && item.specialCollectionId
      ? await prisma.specialCollectionAssignment.findFirst({
          where: { specialCollectionId: item.specialCollectionId, resident: { unitNumber: item.unitNumber } },
          select: { amountDue: true, amountPaid: true },
        })
      : null;
  const expectedSen = isMonthly
    ? months.length * DEFAULT_MONTHLY_FEE_SEN
    : assignment
      ? Math.max(0, assignment.amountDue - assignment.amountPaid)
      : item.specialCollection?.amountPerResident ?? 0;
  const diff = item.amountSen - expectedSen;
  const hashes = item.uploads.map((u) => u.contentHash).filter((h): h is string => Boolean(h));

  const [overlap, dupCount, report] = await Promise.all([
    isMonthly
      ? findExistingOfficialCoverageByUnitNumber(item.unitNumber, item.coverageStartYear, item.coverageStartMonth, item.coverageEndYear, item.coverageEndMonth)
      : null,
    hashes.length ? prisma.upload.count({ where: { contentHash: { in: hashes }, NOT: { submissionId: item.id } } }) : 0,
    getMonthlyReport({ year: nowDate.getFullYear(), month: nowDate.getMonth() + 1, includeInactive: true }),
  ]);
  const house = report.rows.find((row) => row.unitNumber === item.unitNumber);
  const paidUntil = house?.paidUntilYear && house.paidUntilMonth ? monthName(locale, house.paidUntilYear, house.paidUntilMonth, "long") : "—";
  const monthsLabel = months.length
    ? `${monthName(locale, months[0].year, months[0].month)} ${months[0].year} – ${monthName(locale, months.at(-1)!.year, months.at(-1)!.month)} ${months.at(-1)!.year} (${months.length})`
    : item.specialCollection?.title ?? "—";
  const dateFmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short", year: "numeric" });
  const proof = item.uploads[0];
  const proofSrc = proof ? (proof.url ?? `/api/uploads/${proof.storagePath}`) : null;

  const check = (ok: boolean, text: string) => (
    <li className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${ok ? "bg-[#e2f7e1] text-[#1c7a33]" : "bg-[#fff4d6] text-[#8a6300]"}`}>
      {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
      {text}
    </li>
  );

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_1fr] lg:px-6">
      {/* Queue (desktop) */}
      <aside className="hidden lg:block">
        <h1 className="mb-3 font-heading text-xl font-bold">
          {r.title} <span className="text-sm font-medium text-[var(--ink-2)]">· {fill(r.count, { n: queue.length })}</span>
        </h1>
        <ul className="grid gap-1.5">
          {queue.map((s) => (
            <li key={s.id}>
              <Link
                href={`/review?id=${s.id}`}
                className={`grid gap-0.5 rounded-2xl px-4 py-3 text-sm ${s.id === item.id ? "bg-white shadow-sm ring-2 ring-[var(--cyan)]" : "hover:bg-white"}`}
              >
                <span className="flex justify-between gap-2 font-semibold">
                  <span>
                    No. {s.unitNumber} · {s.residentName || "—"}
                  </span>
                  <span className="tabular-nums">{formatRM(s.amountSen)}</span>
                </span>
                <span className="text-xs text-[var(--ink-2)]">
                  {s.paymentType === "MONTHLY_FEE" ? t.dashboard.monthlyFee : s.specialCollection?.title} · {ageLabel(s.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Item */}
      <section className="grid content-start gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)] lg:hidden">{r.title}</p>
            <h2 className="font-heading text-2xl font-bold">
              No. {item.unitNumber} · {item.residentName || "—"}
            </h2>
          </div>
          <div className="flex items-center gap-1 text-sm text-[var(--ink-2)]">
            <Link aria-label="Previous" href={`/review?id=${queue[(index - 1 + queue.length) % queue.length].id}`} className="rounded-full p-1.5 hover:bg-black/5">
              <ChevronLeft size={18} />
            </Link>
            <span className="tabular-nums">{fill(r.of, { i: index + 1, n: queue.length })}</span>
            <Link aria-label="Next" href={`/review?id=${queue[(index + 1) % queue.length].id}`} className="rounded-full p-1.5 hover:bg-black/5">
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {/* Receipt */}
          <div className="ui-card grid min-h-80 place-items-center overflow-hidden p-2">
            {proof && proofSrc ? (
              proof.mimeType === "application/pdf" ? (
                <iframe src={proofSrc} title={proof.originalFilename} className="h-[480px] w-full rounded-xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- private upload served by /api/uploads
                <img src={proofSrc} alt={proof.originalFilename} className="max-h-[480px] w-auto rounded-xl" />
              )
            ) : (
              <p className="text-[var(--ink-2)]">{r.noProof}</p>
            )}
            {item.uploads.length > 0 && (
              <div className="pb-2">
                <FileViewer files={item.uploads} triggerLabel={r.openFile} />
              </div>
            )}
          </div>

          {/* Claim vs expectation */}
          <div className="grid content-start gap-4">
            <div className="ui-card grid gap-3 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">{r.claim}</h3>
              <p className="font-heading text-4xl font-extrabold tracking-tight tabular-nums">{formatRM(item.amountSen)}</p>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-[var(--ink-2)]">{r.months}</dt>
                <dd className="font-medium">{monthsLabel}</dd>
                <dt className="text-[var(--ink-2)]">{r.paidOn}</dt>
                <dd className="font-medium">{dateFmt.format(item.paymentDate)}</dd>
                {item.referenceNo && (
                  <>
                    <dt className="text-[var(--ink-2)]">{r.reference}</dt>
                    <dd className="font-medium">{item.referenceNo}</dd>
                  </>
                )}
                {item.phone && (
                  <>
                    <dt className="text-[var(--ink-2)]">{r.phone}</dt>
                    <dd className="font-medium">{item.phone}</dd>
                  </>
                )}
                {item.notes && (
                  <>
                    <dt className="text-[var(--ink-2)]">{r.notes}</dt>
                    <dd>{item.notes}</dd>
                  </>
                )}
              </dl>
            </div>

            <div className="ui-card grid gap-3 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">{r.expects}</h3>
              <p className="text-sm">
                {r.expected}: <strong className="tabular-nums">{formatRM(expectedSen)}</strong> · {r.paidUntil}: <strong>{paidUntil}</strong>
              </p>
              <ul className="grid gap-1.5">
                {check(diff === 0, diff === 0 ? r.matches : fill(r.differs, { diff: `${diff > 0 ? "+" : "−"}${formatRM(Math.abs(diff))}` }))}
                {isMonthly && check(!overlap, overlap ? fill(r.overlap, { month: `${monthName(locale, overlap.year, overlap.month)} ${overlap.year}` }) : r.noOverlap)}
                {hashes.length > 0 && check(dupCount === 0, dupCount ? r.dupFile : r.noDupFile)}
              </ul>
            </div>
          </div>
        </div>

        <ReviewActions
          approve={approveSubmission.bind(null, item.id)}
          reject={rejectSubmission.bind(null, item.id)}
          labels={{ approve: r.approveNext, reject: r.rejectNext, reason: r.reason, shortcuts: r.shortcuts }}
        />
      </section>
    </main>
  );
}
