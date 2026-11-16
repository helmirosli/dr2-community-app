import { LoadingOverlay } from "@/app/components/loading-overlay";
import { requireDashboardUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { AdminHeader } from "./admin-header";
import { AdminNav } from "./admin-nav";

// Staff shell. Each page still runs its own auth guard; this check only decides whether to draw the shell.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboardUser();
  // ponytail: layouts don't re-render on client navigation, so the badge refreshes on reload or revalidation.
  const pendingCount = await prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } });
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const now = new Date();
  const today = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(now);
  // Greeting by Malaysian local time, first name only.
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kuala_Lumpur" }).format(now));
  const part = hour < 12 ? t.nav.goodMorning : hour < 15 ? t.nav.goodAfternoon : hour < 19 ? t.nav.goodEvening : t.nav.goodNight;
  const greeting = `${part}, ${user.name.split(/\s+/)[0]}`;
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
          <AdminHeader
            greeting={greeting}
            date={today}
            user={{ name: user.name, role: user.role, initials }}
            pendingCount={pendingCount}
            reviewLabel={t.nav.review}
          />
          {children}
        </div>
      </div>
      <LoadingOverlay />
    </>
  );
}
