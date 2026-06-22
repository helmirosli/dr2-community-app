"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import {
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <LogOut size={16} />
      {pending ? "Signing out..." : t.common.signOut}
    </button>
  );
}

export function NavSidebar({ navItems, user }: { navItems: NavItem[]; user: User }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useDictionary();

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav aria-label="Main navigation" className="grid gap-1">
      {navItems.map((item) => {
        const Icon = iconMap[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              active
                ? "bg-cyan-50 text-cyan-700"
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
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-5 pb-6 pt-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-sm font-bold text-white">
            DR2
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">{t.nav.brandName}</p>
            <p className="text-xs text-slate-500">{t.nav.brandTagline}</p>
          </div>
        </div>

        <div className="flex-1 px-5">
          <NavLinks />
        </div>

        <div className="border-t border-slate-100 px-5 py-5">
          <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 p-4 text-sm">
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
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-xs font-bold text-white">
              DR2
            </div>
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
            <NavLinks onClick={() => setOpen(false)} />
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 p-3 text-sm">
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
