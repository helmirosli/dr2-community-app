import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getDictionary } from "@/lib/i18n";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getMonthlyReport } from "@/lib/reports/monthly-data";
import { CopyButton, UnitLookup } from "./home-client";

export const dynamic = "force-dynamic";

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export default async function HomePage() {
  const now = new Date();
  const [t, report, lastReport, collections] = await Promise.all([
    getDictionary(),
    getMonthlyReport({ year: now.getFullYear(), month: now.getMonth() + 1, includeInactive: false }),
    getMonthlyReport({
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      month: now.getMonth() === 0 ? 12 : now.getMonth(),
      includeInactive: false,
    }),
    prisma.specialCollection.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, title: true, amountPerResident: true, assignments: { select: { amountDue: true, amountPaid: true } } },
    }),
  ]);

  const countPaid = (r: typeof report) => r.rows.filter((row) => row.selectedStatus === "PAID" || row.selectedStatus === "UPFRONT").length;
  // Early in the month almost nobody has paid yet, so lead with last month and show this month underneath.
  const leadWithLast = now.getDate() <= 7;
  const lead = leadWithLast ? lastReport : report;
  const other = leadWithLast ? report : lastReport;
  const total = lead.rows.length;
  const paid = countPaid(lead);
  const pct = total ? Math.round((paid / total) * 100) : 0;

  const bank = {
    name: process.env.NEXT_PUBLIC_BANK_NAME ?? "—",
    holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "—",
    account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "—",
  };

  return (
    <>
      {/* Hero: night band */}
      <section className="relative overflow-hidden pt-14 sm:pt-20">
        <div className="relative z-10 mx-auto grid max-w-4xl justify-items-center gap-6 px-4 text-center">
          <p className="text-blend font-heading text-sm font-semibold">Jalan Restu 2 · Desa Restu</p>
          <h1 className="font-heading text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1.04] tracking-tight">
            {t.home.heroTitle}
            <br />
            <span className="text-blend">{t.home.heroLine2}</span>
          </h1>
          <UnitLookup label={t.home.unitLabel} placeholder={t.home.unitPlaceholder} button={t.home.check} />
        </div>
        <picture>
          <source media="(max-width: 640px)" srcSet="/art/a1-hero-mobile.webp" />
          <img
            src="/art/a1-hero.webp"
            alt=""
            width={1600}
            height={900}
            className="mx-auto mt-2 block w-full max-w-6xl [mask-image:radial-gradient(ellipse_70%_75%_at_50%_55%,#000_55%,transparent_100%)] sm:-mt-10"
            fetchPriority="high"
          />
        </picture>
      </section>

      {/* Highlights: paper band */}
      <section className="bg-[var(--paper)] py-16 text-[var(--ink)] sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:grid-cols-6">
          <div className="grid gap-4 rounded-[28px] bg-white p-7 sm:col-span-4">
            <p className="text-sm font-semibold text-[var(--ink-2)]">{leadWithLast ? t.home.lastMonth : t.home.thisMonth}</p>
            <p className="font-heading text-[clamp(2.6rem,7vw,4.5rem)] font-extrabold leading-none tracking-tight">
              <span className="text-blend">{paid}</span>
              <span className="text-[#c7c7cc]"> / {total}</span>
            </p>
            <p className="text-[var(--ink-2)]">{fill(t.home.housesPaid, { paid, total })}</p>
            <div className="h-2 overflow-hidden rounded-full bg-[#e8e8ed]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-[image:var(--blend)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-[var(--ink-2)]">
              {leadWithLast ? t.home.thisMonth : t.home.lastMonth}: {countPaid(other)} / {other.rows.length}
            </p>
          </div>

          <div className="grid content-start gap-3 sm:col-span-2">
            <Link href="/submit" className="grid gap-1 rounded-[28px] bg-[var(--night)] p-6 text-white hover:brightness-110">
              <span className="font-heading text-lg font-bold">{t.home.submitTitle}</span>
              <span className="text-sm text-[#a1a1a6]">{t.home.submitDesc}</span>
              <span className="mt-2 text-sm text-[var(--cyan)]">{t.home.submitTitle} ›</span>
            </Link>
            <Link href="/status" className="grid gap-1 rounded-[28px] bg-white p-6 hover:bg-[#fafafa]">
              <span className="font-heading text-lg font-bold">{t.home.statusTitle}</span>
              <span className="text-sm text-[var(--ink-2)]">{t.home.statusDesc}</span>
              <span className="mt-2 flex items-center text-sm text-[var(--blue)]">
                {t.home.statusTitle} <ChevronRight size={14} aria-hidden="true" />
              </span>
            </Link>
          </div>

          {collections.map((c) => {
            const assigned = c.assignments.length;
            const done = c.assignments.filter((a) => a.amountPaid >= a.amountDue).length;
            const cpct = assigned ? Math.round((done / assigned) * 100) : 0;
            return (
              <div
                key={c.id}
                className="relative grid min-h-56 content-end gap-2 overflow-hidden rounded-[28px] bg-[var(--night)] bg-[url(/art/a6-raya.webp)] bg-[length:auto_70%] bg-right-top bg-no-repeat p-7 text-white sm:col-span-6 sm:min-h-48 sm:bg-cover sm:bg-right sm:bg-no-repeat"
              >
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--night)] via-[var(--night)]/70 to-transparent sm:bg-gradient-to-r sm:via-[var(--night)]/40" />
                <p className="text-blend relative font-heading text-sm font-semibold">{t.home.specialTitle}</p>
                <p className="relative max-w-md font-heading text-2xl font-bold">{c.title}</p>
                <p className="relative text-sm text-[#c7cedd]">
                  {fill(t.home.perHouse, { amount: formatRM(c.amountPerResident) })} · {fill(t.home.specialPaid, { paid: done, total: assigned })}
                </p>
                <div className="relative h-1.5 max-w-sm overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-[image:var(--blend)]" style={{ width: `${cpct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How to pay: white band */}
      <section id="cara-bayar" className="bg-white py-16 text-[var(--ink)] sm:py-24">
        <div className="mx-auto grid max-w-xl gap-6 px-4 text-center">
          <h2 className="font-heading text-[clamp(2rem,5vw,3rem)] font-bold leading-tight tracking-tight">{t.home.howToPay}</h2>
          <dl className="grid gap-px overflow-hidden rounded-3xl bg-[#e8e8ed] text-left ring-1 ring-[#e8e8ed]">
            <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr] items-center gap-3 bg-white px-5 py-4">
              <dt className="text-sm text-[var(--ink-2)]">{t.home.bank}</dt>
              <dd className="font-semibold">{bank.name}</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr] items-center gap-3 bg-white px-5 py-4">
              <dt className="text-sm text-[var(--ink-2)]">{t.home.holder}</dt>
              <dd className="font-semibold">{bank.holder}</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr_auto] sm:grid-cols-[8rem_1fr_auto] items-center gap-3 bg-white px-5 py-4">
              <dt className="text-sm text-[var(--ink-2)]">{t.home.account}</dt>
              <dd className="font-heading text-lg font-bold tracking-wide">{bank.account}</dd>
              <CopyButton value={bank.account} label={t.home.copy} done={t.home.copied} />
            </div>
          </dl>
          <p className="text-[var(--ink-2)]">{t.home.reference}</p>
          <p className="text-sm text-[#86868b]">{t.home.noQr}</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/submit" className="rounded-full bg-[var(--blue)] px-6 py-3 font-semibold text-white hover:brightness-110">
              {t.home.submitTitle}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
