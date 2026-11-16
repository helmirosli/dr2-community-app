import Link from "next/link";
import { Plus } from "lucide-react";

import { GlobalHeaderSearch } from "@/app/components/global-header-search";
import { LoadingOverlay } from "@/app/components/loading-overlay";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "./admin-nav";

// Staff shell. Each page still runs its own auth guard; this check only decides whether to draw the shell.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboardUser();
  // ponytail: layouts don't re-render on client navigation, so the badge refreshes on reload or revalidation.
  const pendingCount = await prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } });
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const today = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return (
    <>
      <div className="min-h-screen max-w-full overflow-x-clip bg-[var(--paper)] lg:grid lg:grid-cols-[264px_1fr]">
        <AdminNav user={{ name: user.name, role: user.role }} pendingCount={pendingCount} />
        <div className="min-w-0 w-full pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 hidden border-b border-black/5 bg-[var(--paper)]/80 backdrop-blur-xl lg:block">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-8">
              <GlobalHeaderSearch />
              <div className="ml-auto flex items-center gap-3">
                <span className="hidden text-sm text-[var(--ink-2)] xl:inline">{today}</span>
                <Link href="/payments/new" className="flex h-9 items-center gap-1.5 rounded-full bg-[var(--blue)] px-4 text-sm font-semibold text-white hover:brightness-110">
                  <Plus size={16} aria-hidden="true" />
                  {t.nav.recordPayment}
                </Link>
                <span
                  title={`${user.name} · ${user.role}`}
                  className="grid size-9 place-items-center rounded-full bg-[var(--night)] text-xs font-bold tracking-wide text-white ring-2 ring-white"
                >
                  {initials}
                </span>
              </div>
            </div>
          </header>
          {children}
        </div>
      </div>
      <LoadingOverlay />
    </>
  );
}
