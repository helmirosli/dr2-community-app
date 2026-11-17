import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { LoadingOverlay } from "@/app/components/loading-overlay";
import { LocaleToggle } from "@/app/components/locale-toggle";
import { TourFooterLink } from "@/app/components/tour/tour-button";
import { TourProvider } from "@/app/components/tour/tour-provider";
import { parseCookie, TOUR_COOKIE } from "@/lib/tours/state";

// Public "night side" shell (spec §3): sticky glass nav, full-bleed pages, light footer.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getDictionary();
  const seen = parseCookie((await cookies()).get(TOUR_COOKIE)?.value);

  return (
    <TourProvider audience="resident" initialSeen={seen}>
      <LoadingOverlay />
      <div className="flex min-h-screen flex-col bg-[var(--night)] text-[#f5f5f7]">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--night)]/75 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex h-12 max-w-6xl items-center gap-5 px-4 text-[13px] text-[#d2d2d7] sm:px-6">
            <Link href="/" className="mr-auto flex items-center gap-2.5 hover:opacity-85">
              <Image src="/jr2-logo.jpeg" alt="" width={26} height={26} className="rounded-full" priority />
              <span className="whitespace-nowrap font-heading text-sm font-semibold text-white">{t.nav.brandName}</span>
            </Link>
            <Link href="/status" className="hidden hover:text-white sm:inline">
              {t.publicLayout.status}
            </Link>
            <Link href="/submit" className="whitespace-nowrap rounded-full bg-[var(--lime)] px-3 py-1 font-semibold text-[#06210b] hover:brightness-105">
              <span className="sm:hidden">{t.publicLayout.submit}</span>
              <span className="hidden sm:inline">{t.home.submitTitle}</span>
            </Link>
            <LocaleToggle dark />
          </div>
        </header>

        {/* Last band stretches so the footer always sits at the bottom on short pages. */}
        <main className="flex flex-1 flex-col [&>section:last-child]:flex-1">{children}</main>

        <footer className="border-t border-black/5 bg-[var(--paper)] text-[13px] text-[var(--ink-2)]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-8 pt-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
            {/* Brand */}
            <div className="col-span-2 grid content-start gap-3 md:col-span-1">
              <Link href="/" className="flex w-fit items-center gap-2.5">
                <Image src="/jr2-logo.jpeg" alt="" width={36} height={36} className="rounded-full" />
                <span className="font-heading text-base font-bold text-[var(--ink)]">{t.nav.brandName}</span>
              </Link>
              <p className="max-w-xs leading-relaxed">{t.publicLayout.about}</p>
            </div>

            {/* Residents */}
            <nav aria-label={t.publicLayout.residents} className="grid content-start gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">{t.publicLayout.residents}</p>
              <Link href="/" className="w-fit hover:text-[var(--ink)]">{t.publicLayout.checkHouse}</Link>
              <Link href="/status" className="w-fit hover:text-[var(--ink)]">{t.home.statusTitle}</Link>
              <Link href="/submit" className="w-fit hover:text-[var(--ink)]">{t.home.submitTitle}</Link>
              <Link href="/#cara-bayar" className="w-fit hover:text-[var(--ink)]">{t.home.howToPay}</Link>
              <TourFooterLink />
            </nav>

            {/* AJK */}
            <div className="grid content-start gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">AJK</p>
              <Link href="/login" className="w-fit hover:text-[var(--ink)]">{t.home.staffLogin} ›</Link>
              <div className="flex items-center gap-2">
                <span>{t.locale.switchLabel}</span>
                <LocaleToggle />
              </div>
            </div>
          </div>

          {/* Fine print */}
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-2 border-t border-black/5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p>
                © {new Date().getFullYear()} {t.nav.brandName}
              </p>
              <p className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="shrink-0 text-[var(--leaf)]" aria-hidden="true" />
                {t.publicLayout.privacyLine}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </TourProvider>
  );
}
