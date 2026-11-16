"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Gift,
  Inbox,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/context";
import { LocaleToggle } from "@/app/components/locale-toggle";

type User = { name: string; role: string };
type Item = { href: string; label: string; icon: LucideIcon; badge?: number };

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

function LogoutButton() {
  const { pending } = useFormStatus();
  const { t } = useDictionary();
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <LogOut size={16} aria-hidden="true" />
      {t.common.signOut}
    </button>
  );
}

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-[image:var(--blend)] px-2 py-0.5 text-[11px] font-bold leading-none text-[#06210b]">
      {count}
    </span>
  );
}

function Brand({ size = 34 }: { size?: number }) {
  const { t } = useDictionary();
  return (
    <div className="flex items-center gap-3">
      <Image src="/jr2-logo.jpeg" alt="JR2 Desa Restu" width={size} height={size} className="rounded-full" />
      <div className="leading-tight">
        <p className="font-heading text-sm font-semibold text-white">{t.nav.brandName}</p>
        <p className="text-xs text-[#8e9ab8]">{t.nav.brandTagline}</p>
      </div>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <div className="rounded-2xl bg-[var(--night-3)] px-4 py-3 text-sm">
      <p className="font-semibold text-white">{user.name}</p>
      <p className="mt-0.5 text-xs text-[#8e9ab8]">{user.role}</p>
    </div>
  );
}

export function AdminNav({ user, pendingCount }: { user: User; pendingCount: number }) {
  const pathname = usePathname();
  const { t } = useDictionary();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the "More" sheet whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMoreOpen(false);
  }

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const sections: { title: string; items: Item[] }[] = [
    { title: t.nav.sectionOverview, items: [{ href: "/dashboard", label: t.nav.today, icon: LayoutDashboard, badge: pendingCount }] },
    { title: t.nav.sectionHouses, items: [{ href: "/residents", label: t.nav.residents, icon: Users }] },
    {
      title: t.nav.sectionMoney,
      items: [
        { href: "/payments", label: t.nav.payments, icon: ReceiptText },
        { href: "/special-collections", label: t.nav.collections, icon: Gift },
        { href: "/reports", label: t.nav.reports, icon: FileSpreadsheet },
      ],
    },
    { title: t.nav.sectionAdmin, items: [{ href: "/settings", label: t.nav.settings, icon: Settings }] },
  ];

  const quickActions = [
    { href: "/payments/new", label: t.nav.recordPayment },
    { href: "/residents/new", label: t.nav.addResident },
    { href: "/special-collections/new", label: t.nav.newCollection },
  ];

  // Mobile bottom tabs (spec §5.5). "Semak" points at the dashboard queue until /review exists (phase 4).
  const tabs: Item[] = [
    { href: "/dashboard", label: t.nav.today, icon: LayoutDashboard },
    { href: "/dashboard#semak", label: t.nav.review, icon: Inbox, badge: pendingCount },
    { href: "/residents", label: t.nav.houses, icon: Users },
    { href: "/payments/new", label: t.nav.record, icon: Plus },
  ];
  const tabHrefs = new Set(["/dashboard", "/residents", "/payments/new"]);
  const moreActive = !moreOpen && sections.flatMap((s) => s.items).some((i) => !tabHrefs.has(i.href) && isActive(pathname, i.href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-[var(--night)] text-[#c7cedd] lg:flex">
        <div className="px-5 pb-6 pt-5">
          <Brand />
        </div>

        <nav aria-label="Main navigation" className="grid flex-1 content-start gap-5 px-3">
          {sections.map((section) => (
            <section key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#5f6b88]">{section.title}</p>
              <div className="grid gap-0.5">
                {section.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        active ? "bg-[var(--night-3)] text-white" : "hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon aria-hidden="true" size={18} className={active ? "text-[var(--lime)]" : undefined} />
                      <span>{label}</span>
                      <Badge count={badge} />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#5f6b88]">{t.nav.quickActions}</p>
            <div className="grid gap-0.5">
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm hover:bg-white/5 hover:text-white">
                  <Plus size={14} aria-hidden="true" className="text-[var(--cyan)]" />
                  {a.label}
                </Link>
              ))}
            </div>
          </section>
        </nav>

        <div className="grid gap-3 px-5 py-5">
          <UserCard user={user} />
          <div className="flex items-center gap-2">
            <form action={logout} className="flex-1">
              <LogoutButton />
            </form>
            <LocaleToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[var(--night)]/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Brand size={30} />
        <LocaleToggle />
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--night)]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5">
          {tabs.map(({ href, label, icon: Icon, badge }) => {
            const active = !moreOpen && !href.includes("#") && isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${active ? "text-[var(--lime)]" : "text-[#8e9ab8]"}`}
              >
                <Icon size={22} aria-hidden="true" />
                {label}
                {badge ? (
                  <span className="absolute left-1/2 top-1 ml-2 min-w-4 rounded-full bg-[var(--due)] px-1 text-center text-[10px] font-bold leading-4 text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-controls="admin-more-sheet"
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${moreOpen || moreActive ? "text-[var(--lime)]" : "text-[#8e9ab8]"}`}
          >
            {moreOpen ? <X size={22} aria-hidden="true" /> : <MoreHorizontal size={22} aria-hidden="true" />}
            {t.nav.more}
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" id="admin-more-sheet">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 grid gap-4 rounded-t-3xl bg-[var(--night-2)] px-4 pb-[calc(env(safe-area-inset-bottom)+84px)] pt-5 text-[#c7cedd]">
            <div className="grid gap-1">
              {sections
                .flatMap((s) => s.items)
                .filter((i) => i.href !== "/dashboard")
                .map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${
                      isActive(pathname, href) ? "bg-[var(--night-3)] text-white" : "hover:bg-white/5"
                    }`}
                  >
                    <Icon size={20} aria-hidden="true" />
                    {label}
                  </Link>
                ))}
            </div>
            <UserCard user={user} />
            <form action={logout}>
              <LogoutButton />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
