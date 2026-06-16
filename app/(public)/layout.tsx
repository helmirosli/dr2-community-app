import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-white/50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition hover:opacity-80">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-white font-bold text-sm">
              DR2
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">DR2 Community</p>
              <p className="hidden text-xs text-slate-500 sm:block">Resident Portal</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/status" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              Status
            </Link>
            <Link href="/submit" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              Submit
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500 sm:px-6">
        <p>DR2 Community Resident Fee System © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
