import { GlobalHeaderSearch } from "@/app/components/global-header-search";
import { LoadingOverlay } from "@/app/components/loading-overlay";
import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "./admin-nav";

// Staff shell. Each page still runs its own auth guard; this check only decides whether to draw the shell.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboardUser();
  // ponytail: layouts don't re-render on client navigation, so the badge refreshes on reload or revalidation.
  const pendingCount = await prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } });

  return (
    <>
      <div className="min-h-screen max-w-full overflow-x-hidden bg-[var(--paper)] lg:grid lg:grid-cols-[264px_1fr]">
        <AdminNav user={{ name: user.name, role: user.role }} pendingCount={pendingCount} />
        <div className="min-w-0 w-full pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 hidden border-b border-black/5 bg-[var(--paper)]/80 backdrop-blur-xl lg:block">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-6">
              <GlobalHeaderSearch />
            </div>
          </header>
          {children}
        </div>
      </div>
      <LoadingOverlay />
    </>
  );
}
