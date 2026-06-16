import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Inbox,
  ReceiptText,
  Search,
  Users,
  XCircle,
} from "lucide-react";

import { approveSubmission, rejectSubmission } from "@/lib/actions/review-submissions";
import { requireDashboardUser } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const currentUser = await requireDashboardUser();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    residentCount,
    pendingSubmissions,
    activeCollections,
    currentMonthPayments,
    totalPayments,
    recentSubmissions,
  ] = await Promise.all([
    prisma.resident.count({ where: { status: "ACTIVE" } }),
    prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.specialCollection.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({
      _sum: { amountSen: true },
      where: {
        paymentDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    prisma.payment.aggregate({ _sum: { amountSen: true } }),
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
      },
    }),
  ]);

  const currentMonthCollection = currentMonthPayments._sum.amountSen ?? 0;
  const totalCollection = totalPayments._sum.amountSen ?? 0;
  const monthlyTarget = residentCount * 5000;
  const collectionProgress = monthlyTarget > 0 ? Math.min(100, Math.round((currentMonthCollection / monthlyTarget) * 100)) : 0;

  const metrics = [
    {
      label: "Current month collection",
      value: formatRM(currentMonthCollection),
      helper: `${collectionProgress}% of ${formatRM(monthlyTarget)} target`,
      icon: Banknote,
      accent: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    },
    {
      label: "Active residents",
      value: residentCount.toString(),
      helper: "Households tracked for monthly fee",
      icon: Users,
      accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    {
      label: "Pending review",
      value: pendingSubmissions.toString(),
      helper: "Public submissions waiting for AJK",
      icon: Inbox,
      accent: "bg-amber-50 text-amber-700 ring-amber-100",
    },
    {
      label: "Special collections",
      value: activeCollections.toString(),
      helper: "Active extra payment campaigns",
      icon: CalendarClock,
      accent: "bg-sky-50 text-sky-700 ring-sky-100",
    },
  ];

  const workflowItems = [
    {
      title: "Review public submissions",
      description: "Approve only after unit, amount, and reference are checked.",
      icon: CheckCircle2,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      title: "Record official payments",
      description: "Use month range coverage for current, backdated, or upfront payment.",
      icon: ReceiptText,
      tone: "text-cyan-700 bg-cyan-50",
    },
    {
      title: "Export resident report",
      description: "Generate PDF or Excel for residents to double-check paid-until month.",
      icon: Download,
      tone: "text-sky-700 bg-sky-50",
    },
  ];

  return (
    <main className="px-6 py-8 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="flex flex-col gap-4 sm:gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
              {monthLabel(now.getFullYear(), now.getMonth() + 1)} operations
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Resident fee dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-600">
              Monitor monthly collection, review resident submissions, and prepare shareable payment reports for DR2 community residents.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              href="/submit"
            >
              <FileText size={17} />
              <span>Public form</span>
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              href="/reports"
            >
              <FileSpreadsheet size={17} />
              <span>Reports</span>
            </Link>
            <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" type="button">
              <ReceiptText size={17} />
              <span>Record payment</span>
            </button>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={metric.label}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{metric.value}</p>
                  </div>
                  <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ring-1 ${metric.accent}`}>
                    <Icon aria-hidden="true" size={24} />
                  </div>
                </div>
                <p className="mt-4 min-h-5 text-sm text-slate-600">{metric.helper}</p>
              </div>
            );
          })}
        </section>

        {/* Main content grid */}
        <section className="grid gap-8 xl:grid-cols-[1fr_320px]">
          {/* Left: Submissions queue */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Submission review queue</h2>
                <p className="mt-1 text-sm text-slate-500">Latest resident submissions waiting for verification.</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="button">
                <Search size={16} />
                Filter
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-220 border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Resident</th>
                    <th className="px-6 py-3 font-semibold">Coverage</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSubmissions.length > 0 ? (
                    recentSubmissions.map((submission) => (
                      <tr className="transition hover:bg-slate-50" key={submission.id}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{submission.unitNumber}</p>
                          <p className="mt-0.5 text-sm text-slate-500">{submission.residentName}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {monthLabel(submission.coverageStartYear, submission.coverageStartMonth)} – {monthLabel(submission.coverageEndYear, submission.coverageEndMonth)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {submission.paymentType === "MONTHLY_FEE" ? "Monthly fee" : "Special collection"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{formatRM(submission.amountSen)}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                            <AlertTriangle size={13} />
                            Review
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <form action={approveSubmission.bind(null, submission.id)}>
                              <button className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700" type="submit">
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                            </form>
                            <form action={rejectSubmission.bind(null, submission.id)}>
                              <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700" type="submit">
                                <XCircle size={14} />
                                Reject
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-500" colSpan={6}>
                        No pending submissions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Collection health + workflow */}
          <div className="grid gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Collection health</h2>
                  <p className="mt-1 text-xs text-slate-500">Monthly RM50 target</p>
                </div>
                <CheckCircle2 className="shrink-0 text-emerald-600" size={28} />
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">Progress</span>
                    <span className="font-bold text-cyan-700">{collectionProgress}%</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-cyan-600" style={{ width: `${collectionProgress}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Month target</p>
                    <p className="mt-1.5 font-bold text-slate-900">{formatRM(monthlyTarget)}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">All-time</p>
                    <p className="mt-1.5 font-bold text-slate-900">{formatRM(totalCollection)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Workflow</h2>
              <div className="mt-4 space-y-3">
                {workflowItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="flex gap-3 rounded-lg border border-slate-100 p-3" key={item.title}>
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-4 text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Footer cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Resident ledger", "Keep house/unit payment records tidy before exports."],
            ["Extra collection", "Track festival or emergency guard payments separately."],
            ["Audit readiness", "Every approval should leave a clear review trail."],
          ].map(([title, body]) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md" key={title}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <ArrowRight className="shrink-0 text-cyan-600" size={18} />
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-600">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}