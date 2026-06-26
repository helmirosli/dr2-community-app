import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Inbox,
  Plus,
  ReceiptText,
  Users,
  XCircle,
} from "lucide-react";

import { approveSubmission, rejectSubmission } from "@/lib/actions/review-submissions";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";
import { FileViewer } from "@/app/components/file-viewer";
import { ApproveRejectButton } from "./approve-reject-button";

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
    recentSubmissions,
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
    prisma.publicPaymentSubmission.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        unitNumber: true,
        residentName: true,
        amountSen: true,
        paymentType: true,
        createdAt: true,
        coverageStartYear: true,
        coverageStartMonth: true,
        coverageEndYear: true,
        coverageEndMonth: true,
        uploads: {
          select: {
            id: true,
            originalFilename: true,
            storagePath: true,
            mimeType: true,
            url: true,
          },
        },
      },
    }),
  ]);

  const t = await getDictionary();

  const currentMonth = now.getMonth() + 1; // 1–12
  const currentMonthFeeCollection = currentMonthFeePayments._sum.amountSen ?? 0;
  const monthlyTarget = residentCount * 5000; // RM50 per active resident
  const collectionProgress = monthlyTarget > 0
    ? Math.min(100, Math.round((currentMonthFeeCollection / monthlyTarget) * 100))
    : 0;

  // Year-to-date: Jan → current month inclusive
  const ytdCollected  = ytdFeePayments._sum.amountSen ?? 0;
  const ytdTarget     = currentMonth * residentCount * 5000; // months elapsed × RM50
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
              {monthLabel(now.getFullYear(), now.getMonth() + 1)} {now.getFullYear()}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {t.dashboard.title}
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

        {/* Pending alert banner */}
        {pendingSubmissions > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="shrink-0 text-amber-600" size={20} />
              <p className="text-sm font-semibold text-amber-900">
                {pendingSubmissions} submission{pendingSubmissions > 1 ? "s" : ""} waiting for review
              </p>
            </div>
            <Link
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
              href="/payments"
            >
              Review all
            </Link>
          </div>
        )}

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

        {/* Pending submissions queue */}
        <section className="ui-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t.dashboard.submissionQueue}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{t.dashboard.submissionQueueSubtitle}</p>
            </div>
            {pendingSubmissions > 5 && (
              <Link className="text-xs font-semibold text-brand-700 hover:underline" href="/payments">
                View all {pendingSubmissions} →
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-200 border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.resident}</th>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.type}</th>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.coverage}</th>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.amount}</th>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.proof}</th>
                  <th className="px-5 py-3 font-semibold">{t.dashboard.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission) => (
                    <tr className="transition hover:bg-cyan-50/30" key={submission.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-900">{submission.unitNumber}</p>
                        <p className="text-xs text-slate-500">{submission.residentName}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                          submission.paymentType === "MONTHLY_FEE"
                            ? "bg-cyan-50 text-cyan-700 ring-cyan-100"
                            : "bg-sky-50 text-sky-700 ring-sky-100"
                        }`}>
                          {submission.paymentType === "MONTHLY_FEE" ? t.dashboard.monthlyFee : t.dashboard.specialCollection}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {monthLabel(submission.coverageStartYear, submission.coverageStartMonth)}
                        {" – "}
                        {monthLabel(submission.coverageEndYear, submission.coverageEndMonth)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{formatRM(submission.amountSen)}</td>
                      <td className="px-5 py-3">
                        <FileViewer files={submission.uploads} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <ApproveRejectButton
                            action={approveSubmission.bind(null, submission.id)}
                            label={<><CheckCircle2 size={13} />{t.common.approve}</>}
                            className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          />
                          <ApproveRejectButton
                            action={rejectSubmission.bind(null, submission.id)}
                            label={<><XCircle size={13} />{t.common.reject}</>}
                            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-12 text-center text-slate-500" colSpan={6}>
                      <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={28} />
                      {t.dashboard.noPending}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
