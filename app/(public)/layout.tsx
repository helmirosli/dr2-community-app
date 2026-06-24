import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { PublicLayoutClient } from "./public-layout-client";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [t, user] = await Promise.all([getDictionary(), getCurrentUser()]);

  if (user) {
    return (
      <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-4xl gap-6">
          {children}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-border-subtle bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 shadow-sm ring-1 ring-slate-200/50 text-white font-bold text-sm">
              DR2
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">{t.nav.brandName}</p>
              <p className="hidden text-xs text-slate-500 sm:block">{t.publicLayout.residentPortal}</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/status" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
              {t.publicLayout.status}
            </Link>
            <Link href="/submit" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
              {t.publicLayout.submit}
            </Link>
            <PublicLayoutClient />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-white px-4 py-6 text-center text-xs text-slate-500 sm:px-6">
        <p>{t.publicLayout.footer} © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
