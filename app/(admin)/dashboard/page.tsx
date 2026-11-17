import Link from "next/link";
import {
  Banknote,
  CalendarClock,
  FileSpreadsheet,
  FileText,
  Inbox,
  Plus,
  Users,
} from "lucide-react";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { DEFAULT_MONTHLY_FEE_SEN, formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { HouseTile, StatusPill } from "@/app/components/status";
import { getPendingSubmissionsMap } from "@/lib/payments/coverage";
import { getYearGridData } from "@/lib/reports/year-grid-data";
import { monthState } from "@/lib/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  await requireDashboardUser();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    residentCount,
    pendingSubmissions,
    currentMonthFeePayments,
    ytdFeePayments,
    activeCollectionAssignments,
    recentActivity,
  ] = await Promise.all([
    prisma.resident.count({ where: { status: "ACTIVE" } }),
    prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } }),

    // Monthly fees only — keeps target (residents × RM50) meaningful
    prisma.payment.aggregate({
      _sum: { amountSen: true },
      where: {
        paymentType: "MONTHLY_FEE",
        paymentDate: { gte: monthStart, lt: nextMonthStart },
      },
    }),
    // YTD monthly fees: Jan 1 → today
    prisma.payment.aggregate({
      _sum: { amountSen: true },
      where: {
        paymentType: "MONTHLY_FEE",
        paymentDate: { gte: new Date(now.getFullYear(), 0, 1), lt: nextMonthStart },
      },
    }),
    // Active special collections: total due vs paid across all assignments
    prisma.specialCollectionAssignment.aggregate({
      _sum: { amountDue: true, amountPaid: true },
      where: { specialCollection: { status: "ACTIVE" } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, entityType: true, action: true, createdAt: true, createdBy: true },
    }),
  ]);

  const [t, locale, grid, residentIds, pendingThisMonth] = await Promise.all([
    getDictionary(),
    getLocale(),
    getYearGridData({ year: now.getFullYear(), includeInactive: true }),
    prisma.resident.findMany({ select: { id: true, unitNumber: true } }),
    prisma.publicPaymentSubmission.findMany({
      where: { status: "PENDING_REVIEW", paymentType: "MONTHLY_FEE" },
      select: { unitNumber: true, amountSen: true, coverageStartYear: true, coverageStartMonth: true, coverageEndYear: true, coverageEndMonth: true },
    }),
  ]);
  const pendingSummary = await prisma.publicPaymentSubmission.aggregate({
    where: { status: "PENDING_REVIEW" },
    _sum: { amountSen: true },
    _min: { createdAt: true },
  });
  const oldestDays = pendingSummary._min.createdAt
    ? Math.floor((now.getTime() - pendingSummary._min.createdAt.getTime()) / 86_400_000)
    : null;
  const idByUnit = new Map(residentIds.map((r) => [r.unitNumber, r.id]));
  const pendingMap = getPendingSubmissionsMap(pendingThisMonth);
  const monthIndex = now.getMonth();
  const strip = [...grid.rows]
    .sort((a, b) => Number(a.unitNumber) - Number(b.unitNumber) || a.unitNumber.localeCompare(b.unitNumber))
    .map((row) => ({
      unit: row.unitNumber,
      id: idByUnit.get(row.unitNumber),
      state: monthState({
        amountSen: row.months[monthIndex],
        override: row.monthStatusOverrides[monthIndex],
        residentStatus: row.monthStatus[monthIndex],
        isFuture: false,
        pending: pendingMap.has(`${row.unitNumber}:${now.getFullYear()}:${monthIndex + 1}`),
      }),
    }));
  const userIds = [...new Set(recentActivity.map((a) => a.createdBy).filter((v): v is string => Boolean(v)))];
  const actors = new Map(
    (await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );
  const timeFmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const currentMonth = now.getMonth() + 1; // 1–12
  const currentMonthFeeCollection = currentMonthFeePayments._sum.amountSen ?? 0;
  const monthlyTarget = residentCount * DEFAULT_MONTHLY_FEE_SEN;
  const collectionProgress = monthlyTarget > 0
    ? Math.min(100, Math.round((currentMonthFeeCollection / monthlyTarget) * 100))
    : 0;

  // Year-to-date: Jan → current month inclusive
  const ytdCollected  = ytdFeePayments._sum.amountSen ?? 0;
  const ytdTarget     = currentMonth * residentCount * DEFAULT_MONTHLY_FEE_SEN; // months elapsed
  const ytdProgress   = ytdTarget > 0
    ? Math.min(100, Math.round((ytdCollected / ytdTarget) * 100))
    : 0;
  const ytdGap = Math.max(0, ytdTarget - ytdCollected);

  const specialCollectionDue  = activeCollectionAssignments._sum.amountDue  ?? 0;
  const specialCollectionPaid = activeCollectionAssignments._sum.amountPaid ?? 0;
  const specialCollectionOutstanding = Math.max(0, specialCollectionDue - specialCollectionPaid);
  const specialCollectionProgress = specialCollectionDue > 0
    ? Math.min(100, Math.round((specialCollectionPaid / specialCollectionDue) * 100))
    : 0;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 [&>*]:min-w-0">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              {monthLabel(now.getFullYear(), now.getMonth() + 1)}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-slate-900">
              {t.today.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="ui-button-secondary" href="/submit">
              <FileText size={15} />
              <span>{t.dashboard.publicForm}</span>
            </Link>
            <Link className="ui-button-secondary" href="/reports">
              <FileSpreadsheet size={15} />
              <span>{t.dashboard.reports}</span>
            </Link>
            <Link className="ui-button-primary" href="/payments/new">
              <Plus size={15} />
              <span>{t.dashboard.recordPayment}</span>
            </Link>
          </div>
        </div>

        {/* Review queue summary (spec §5.6) */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div data-tour="today-review" className="relative isolate overflow-hidden rounded-[28px] bg-[var(--night)] text-white">
            {/* Guardhouse art (A2) on the right, fading into the navy. While payments wait it comes alive:
                lamp glow pulses, the camera drifts slowly and fireflies rise (all off under reduced motion). */}
            <div
              aria-hidden="true"
              className={`absolute inset-y-0 right-0 -z-10 w-3/5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_45%)] ${
                pendingSubmissions ? "" : "opacity-40 grayscale"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
              <img
                src="/art/a2-login.webp"
                alt=""
                className={`h-full w-full object-cover object-[50%_35%] ${pendingSubmissions ? "animate-drift" : ""}`}
              />
              {pendingSubmissions > 0 && (
                <>
                  <span className="animate-glow absolute left-[49%] top-[49%] size-40 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,0.55),rgba(34,199,242,0.12)_45%,transparent_70%)] mix-blend-screen" />
                  {[
                    { left: "30%", top: "78%", delay: "0s", color: "bg-[var(--lime)]" },
                    { left: "62%", top: "70%", delay: "1.4s", color: "bg-[var(--cyan)]" },
                    { left: "44%", top: "86%", delay: "2.6s", color: "bg-[var(--lime)]" },
                    { left: "75%", top: "82%", delay: "3.5s", color: "bg-[var(--cyan)]" },
                    { left: "55%", top: "92%", delay: "4.3s", color: "bg-[var(--lime)]" },
                  ].map((f) => (
                    <span
                      key={f.left}
                      className={`animate-rise absolute size-1.5 rounded-full opacity-0 shadow-[0_0_8px_2px_currentColor] ${f.color}`}
                      style={{ left: f.left, top: f.top, animationDelay: f.delay }}
                    />
                  ))}
                </>
              )}
            </div>
            <div className="grid min-h-60 content-between gap-6 p-6">
              <p className="flex items-center gap-2 text-sm font-medium text-[#c7cedd]">
                {pendingSubmissions > 0 && (
                  <span className="relative flex size-2.5" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--cyan)] opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-[var(--cyan)]" />
                  </span>
                )}
                {t.dashboard.pendingReview}
              </p>

              {pendingSubmissions > 0 ? (
                <div className="grid gap-1">
                  <p className="font-heading text-7xl font-extrabold leading-none tracking-tight">
                    <span className="text-blend">{pendingSubmissions}</span>
                  </p>
                  <p className="text-sm text-[#a1a1a6]">
                    {t.today.waiting.replace("{amount}", formatRM(pendingSummary._sum.amountSen ?? 0))}
                    {oldestDays !== null && (
                      <> · {oldestDays < 1 ? t.today.oldestToday : t.today.oldest.replace("{n}", String(oldestDays))}</>
                    )}
                  </p>
                </div>
              ) : (
                <div className="grid gap-1">
                  <p className="font-heading text-3xl font-bold tracking-tight">{t.today.allClear}</p>
                  <p className="text-sm text-[#a1a1a6]">{t.today.reviewNone}</p>
                </div>
              )}

              {pendingSubmissions > 0 && (
                <Link
                  href="/review"
                  className="w-fit rounded-full bg-[var(--lime)] px-5 py-2.5 font-heading text-sm font-semibold text-[#06210b] shadow-[0_8px_24px_rgba(142,229,63,0.25)] hover:brightness-105"
                >
                  {t.today.reviewCta.replace("{n}", String(pendingSubmissions))} ›
                </Link>
              )}
            </div>
          </div>

          {/* House strip: this month's status per house */}
          <div data-tour="today-houses" className="ui-card grid content-start gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">{t.today.houses}</h2>
              <Link href="/residents?view=map" className="text-xs font-semibold text-[var(--blue)] hover:underline">
                {t.today.map} ›
              </Link>
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
              {strip.map((h) => (
                <HouseTile key={h.unit} unit={h.unit} state={h.state} label={t.states[h.state]} href={h.id ? `/residents/${h.id}` : undefined} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["paid", "pending", "partial", "unpaid", "hold"] as const).map((st) => (
                <StatusPill key={st} state={st} label={`${t.states[st]} · ${strip.filter((h) => h.state === st || (st === "paid" && h.state === "ahead")).length}`} />
              ))}
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Monthly fee collection this month */}
          <div className="ui-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{t.dashboard.currentMonthCollection}</p>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 ring-1 ring-cyan-100">
                <Banknote className="text-cyan-700" size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{formatRM(currentMonthFeeCollection)}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>of {formatRM(monthlyTarget)} target</span>
                <span className="font-semibold text-cyan-700">{collectionProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${collectionProgress}%` }} />
              </div>
            </div>
          </div>

          {/* Active residents */}
          <div className="ui-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{t.dashboard.activeResidents}</p>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
                <Users className="text-emerald-700" size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{residentCount}</p>
            <p className="mt-3 text-xs text-slate-500">{t.dashboard.activeResidentsHelper}</p>
          </div>

          {/* Pending review */}
          <div className={`ui-card p-5 ${pendingSubmissions > 0 ? "ring-1 ring-amber-200" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{t.dashboard.pendingReview}</p>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ${pendingSubmissions > 0 ? "bg-amber-50 ring-amber-100" : "bg-slate-50 ring-slate-100"}`}>
                <Inbox className={pendingSubmissions > 0 ? "text-amber-700" : "text-slate-400"} size={18} />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-bold tracking-tight ${pendingSubmissions > 0 ? "text-amber-700" : "text-slate-900"}`}>
              {pendingSubmissions}
            </p>
            <p className="mt-3 text-xs text-slate-500">{t.dashboard.pendingReviewHelper}</p>
          </div>

          {/* Active special collections */}
          <div className="ui-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{t.dashboard.specialCollections}</p>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-sky-100">
                <CalendarClock className="text-sky-700" size={18} />
              </div>
            </div>
            {specialCollectionDue > 0 ? (
              <>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{formatRM(specialCollectionPaid)}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>of {formatRM(specialCollectionDue)} due</span>
                    <span className="font-semibold text-sky-700">{specialCollectionProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${specialCollectionProgress}%` }} />
                  </div>
                  {specialCollectionOutstanding > 0 && (
                    <p className="mt-2 text-xs text-amber-600 font-medium">{formatRM(specialCollectionOutstanding)} outstanding</p>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No active collections</p>
            )}
          </div>
        </section>

        {/* Recent activity (AuditLog, last 8) */}
        <section className="ui-card p-5">
          <h2 className="text-sm font-semibold text-slate-900">{t.today.activity}</h2>
          {recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t.today.noActivity}</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{a.action.replaceAll("_", " ").toLowerCase()}</span>{" "}
                    <span className="text-slate-500">· {a.entityType}{a.createdBy ? ` · ${actors.get(a.createdBy) ?? "—"}` : ""}</span>
                  </span>
                  <time className="shrink-0 text-xs text-slate-500" dateTime={a.createdAt.toISOString()}>
                    {timeFmt.format(a.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bottom row: collection health + quick links */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* YTD collection health — spans 2 cols */}
          <div className="ui-card p-5 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-900">Year-to-date collection</h2>
              <span className="text-xs text-slate-500">{now.getFullYear()} · Jan – {now.toLocaleString("en", { month: "short" })}</span>
            </div>
            <div className="mt-4">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold tracking-tight text-slate-900">{formatRM(ytdCollected)}</p>
                <p className="text-sm font-semibold text-cyan-700">{ytdProgress}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${ytdProgress}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span>YTD target: <strong className="text-slate-900">{formatRM(ytdTarget)}</strong></span>
                <span>{currentMonth} months × {residentCount} units × RM50</span>
                {ytdGap > 0 && (
                  <span className="text-amber-600 font-medium">{formatRM(ytdGap)} short</span>
                )}
                {ytdGap === 0 && ytdTarget > 0 && (
                  <span className="text-emerald-600 font-medium">On track ✓</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <Link className="ui-card flex items-center gap-4 p-5 transition hover:shadow-md" href="/residents">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
              <Users className="text-emerald-700" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.dashboard.residentLedger}</p>
              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{t.dashboard.residentLedgerDesc}</p>
            </div>
          </Link>

          <Link className="ui-card flex items-center gap-4 p-5 transition hover:shadow-md" href="/special-collections">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-sky-100">
              <CalendarClock className="text-sky-700" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.dashboard.extraCollection}</p>
              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{t.dashboard.extraCollectionDesc}</p>
            </div>
          </Link>
        </section>

      </div>
    </main>
  );
}
