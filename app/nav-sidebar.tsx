"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import {
  ChevronDown,
  FileSpreadsheet,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Users,
  X,
} from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/context";
import { LocaleToggle } from "./components/locale-toggle";

const iconMap = { LayoutDashboard, Users, ReceiptText, Gift, FileSpreadsheet, Settings } as const;

type NavItem = {
  label: string;
  icon: keyof typeof iconMap;
  href: string;
  highlight?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type User = {
  name: string;
  role: string;
};

function LogoutButton() {
  const { pending } = useFormStatus();
  const { t } = useDictionary();
  return (
    <button
    className="ui-button-secondary w-full"
      disabled={pending}
      type="submit"
    >
      <LogOut size={16} />
      {pending ? "Signing out..." : t.common.signOut}
    </button>
  );
}

export function NavSidebar({ navSections, user }: { navSections: NavSection[]; user: User }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { t } = useDictionary();

  const renderNavLinks = (onClick?: () => void) => (
      <nav aria-label="Main navigation" className="grid gap-4">
        {navSections.map((section) => {
          const hasActive = section.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
          );
          const isCollapsed = collapsed[section.title] ?? false;
          const sectionId = `nav-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`;

          return (
            <section key={section.title}>
              <button
                className="mb-2 flex w-full items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [section.title]: !(prev[section.title] ?? false),
                  }))
                }
                type="button"
                aria-expanded={!isCollapsed || hasActive}
                aria-controls={sectionId}
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={`transition ${isCollapsed && !hasActive ? "-rotate-90" : ""}`}
                  size={14}
                />
              </button>
              {(!isCollapsed || hasActive) && (
                <div className="grid gap-1" id={sectionId}>
                  {section.items.map((item) => {
                    const Icon = iconMap[item.icon];
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                          active
                            ? "bg-brand-50 text-brand-700"
                            : item.highlight
                              ? "bg-slate-900 text-white hover:bg-slate-800"
                              : "text-slate-700 hover:bg-slate-100"
                        }`}
                        href={item.href}
                        key={item.label}
                        onClick={onClick}
                      >
                        <Icon aria-hidden="true" size={18} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>
    );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-5 pb-6 pt-5">
          <Image
            src="/jr2-logo.jpeg"
            alt="JR2 Desa Restu"
            width={40}
            height={40}
            className="rounded-lg ring-1 ring-slate-200"
          />
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">{t.nav.brandName}</p>
            <p className="text-xs text-slate-500">{t.nav.brandTagline}</p>
          </div>
        </div>

        <div className="flex-1 px-5">
          {renderNavLinks()}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</p>
            <div className="mt-2 grid gap-1">
              <Link className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100" href="/payments/new">
                + Record payment
              </Link>
              <Link className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100" href="/residents/new">
                + Add resident
              </Link>
              <Link className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100" href="/special-collections/new">
                + New collection
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-5">
          <div className="rounded-lg bg-linear-to-br from-cyan-50 to-blue-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="mt-0.5 text-xs text-slate-600">{user.role}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <form action={logout} className="flex-1">
              <LogoutButton />
            </form>
            <LocaleToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Image
              src="/jr2-logo.jpeg"
              alt="JR2 Desa Restu"
              width={32}
              height={32}
              className="rounded-lg ring-1 ring-slate-200"
            />
            <p className="text-sm font-bold tracking-tight text-slate-900">{t.nav.brandName}</p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onClick={() => setOpen((v) => !v)}
              type="button"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-md">
            {renderNavLinks(() => setOpen(false))}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="rounded-lg bg-linear-to-br from-cyan-50 to-blue-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="mt-0.5 text-xs text-slate-600">{user.role}</p>
              </div>
              <form action={logout} className="mt-3">
                <LogoutButton />
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
