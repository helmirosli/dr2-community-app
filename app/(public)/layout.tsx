import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { LocaleToggle } from "@/app/components/locale-toggle";

// Public "night side" shell (spec §3): sticky glass nav, full-bleed pages, light footer.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getDictionary();

  return (
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

      <footer className="border-t border-black/5 bg-[var(--paper)] text-xs text-[var(--ink-2)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p>
            {t.publicLayout.footer} © {new Date().getFullYear()}
          </p>
          <Link href="/login" className="text-[var(--blue)] hover:underline">
            {t.home.staffLogin} ›
          </Link>
        </div>
      </footer>
    </div>
  );
}
