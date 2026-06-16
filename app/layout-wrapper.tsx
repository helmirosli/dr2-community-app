import Link from "next/link";
import {
  BarChart3,
  FileSpreadsheet,
  Gift,
  Home,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Residents", icon: Users, href: "/residents" },
  { label: "Payments", icon: ReceiptText, href: "/payments" },
  { label: "Collections", icon: Gift, href: "/special-collections" },
  { label: "Reports", icon: FileSpreadsheet, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/dashboard" },
];

export async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Only apply sidebar layout for authenticated admin users
  // Public pages will use their own layout from the (public) route group
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[280px_1fr] bg-slate-50">
      {/* Sidebar */}
      <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="flex items-center gap-3 pb-6 lg:pb-8">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-white font-bold text-sm">
            DR2
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">DR2 Community</p>
            <p className="text-xs text-slate-500">Resident Fee System</p>
          </div>
        </div>

        <nav aria-label="Main navigation" className="grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                href={item.href}
                key={item.label}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="mt-0.5 text-xs text-slate-600">{user.role}</p>
          </div>

          <form action={logout} className="mt-4">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              type="submit"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="overflow-auto">{children}</div>
    </div>
  );
}
