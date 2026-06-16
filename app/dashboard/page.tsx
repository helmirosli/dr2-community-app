import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import { logout } from "@/lib/actions/auth";
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

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard", active: true },
    { label: "Residents", icon: Home, href: "/residents" },
    { label: "Payments", icon: ReceiptText, href: "/payments" },
    { label: "Submissions", icon: ClipboardList, href: "/dashboard" },
    { label: "Reports", icon: FileSpreadsheet, href: "/dashboard" },
    { label: "Settings", icon: Settings, href: "/dashboard" },
  ];

  const workflowItems = [
    {
      title: "Review public submissions",
      description: "Approve only after unit, amount, and reference are checked.",
      icon: ShieldCheck,
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
    <main className="min-h-screen bg-[#f6fafb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-cyan-950/10 bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-cyan-700 text-white shadow-sm">
              <ShieldCheck aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">DR2 Community</p>
              <p className="text-sm text-slate-500">Admin & AJK console</p>
            </div>
          </div>

          <nav aria-label="Dashboard navigation" className="mt-8 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-200 ${
                    item.active ? "bg-cyan-50 text-cyan-800" : "text-slate-600"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <Icon aria-hidden="true" size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
            <div className="flex items-center gap-2 text-cyan-800">
              <LockKeyhole aria-hidden="true" size={18} />
              <p className="text-sm font-semibold">Access model</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-cyan-950/75">
              Residents submit without login. Admin and AJK approve records before they become official payments.
            </p>
          </div>

          <form action={logout} className="mt-4">
            <button className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-200" type="submit">
              Sign out
            </button>
          </form>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6">
            <header className="flex flex-col gap-5 rounded-lg border border-cyan-950/10 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
                  {monthLabel(now.getFullYear(), now.getMonth() + 1)} operations
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Resident fee dashboard
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Monitor monthly collection, review resident submissions, and prepare shareable payment reports for DR2 community residents. Signed in as {currentUser.name} ({currentUser.role}).
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50 focus:outline-none focus:ring-4 focus:ring-cyan-200"
                  href="/submit"
                >
                  <FileText aria-hidden="true" size={17} />
                  Public form
                </Link>
                <button className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200" type="button">
                  <ReceiptText aria-hidden="true" size={17} />
                  Record payment
                </button>
              </div>
            </header>

            <section className="grid gap-4 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm" key={metric.label}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</p>
                      </div>
                      <div className={`flex size-11 items-center justify-center rounded-lg ring-1 ${metric.accent}`}>
                        <Icon aria-hidden="true" size={21} />
                      </div>
                    </div>
                    <p className="mt-4 min-h-5 text-sm text-slate-600">{metric.helper}</p>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-lg border border-cyan-950/10 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Submission review queue</h2>
                    <p className="mt-1 text-sm text-slate-500">Latest resident submissions waiting for verification.</p>
                  </div>
                  <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-cyan-200" type="button">
                    <Search aria-hidden="true" size={16} />
                    Filter
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-220 border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Resident</th>
                        <th className="px-5 py-3 font-semibold">Coverage</th>
                        <th className="px-5 py-3 font-semibold">Type</th>
                        <th className="px-5 py-3 font-semibold">Amount</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentSubmissions.length > 0 ? (
                        recentSubmissions.map((submission) => (
                          <tr className="align-middle transition hover:bg-cyan-50/40" key={submission.id}>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-950">{submission.unitNumber}</p>
                              <p className="mt-1 text-slate-500">{submission.residentName}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {monthLabel(submission.coverageStartYear, submission.coverageStartMonth)} to {monthLabel(submission.coverageEndYear, submission.coverageEndMonth)}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {submission.paymentType === "MONTHLY_FEE" ? "Monthly fee" : "Special collection"}
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-950">{formatRM(submission.amountSen)}</td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                                <AlertTriangle aria-hidden="true" size={13} />
                                Review
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <form action={approveSubmission.bind(null, submission.id)}>
                                  <button className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200" type="submit">
                                    <CheckCircle2 aria-hidden="true" size={14} />
                                    Approve
                                  </button>
                                </form>
                                <form action={rejectSubmission.bind(null, submission.id)}>
                                  <button className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100" type="submit">
                                    <XCircle aria-hidden="true" size={14} />
                                    Reject
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                            No pending resident submissions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Collection health</h2>
                      <p className="mt-1 text-sm text-slate-500">Monthly RM50 resident fee target.</p>
                    </div>
                    <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={24} />
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Progress</span>
                      <span className="font-semibold text-cyan-800">{collectionProgress}%</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-cyan-600" style={{ width: `${collectionProgress}%` }} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-slate-500">Month target</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatRM(monthlyTarget)}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-slate-500">All-time total</p>
                        <p className="mt-1 font-semibold text-slate-950">{formatRM(totalCollection)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold tracking-tight">Operational workflow</h2>
                  <div className="mt-4 grid gap-3">
                    {workflowItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div className="flex gap-3 rounded-md border border-slate-100 p-3" key={item.title}>
                          <div className={`flex size-10 shrink-0 items-center justify-center rounded-md ${item.tone}`}>
                            <Icon aria-hidden="true" size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                            <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              {[
                ["Resident ledger", "Keep house/unit payment records tidy before exports."],
                ["Extra collection", "Track festival or emergency guard payments separately."],
                ["Audit readiness", "Every approval should leave a clear review trail."],
              ].map(([title, body]) => (
                <div className="rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm" key={title}>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-base font-semibold text-slate-950">{title}</h2>
                    <ArrowRight aria-hidden="true" className="text-cyan-700" size={18} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}