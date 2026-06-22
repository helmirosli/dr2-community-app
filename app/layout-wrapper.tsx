import { getDictionary } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { LoadingOverlay } from "./components/loading-overlay";
import { NavSidebar } from "./nav-sidebar";

const allNavItems = [
  { key: "dashboard" as const, icon: "LayoutDashboard" as const, href: "/dashboard", requiredRole: undefined },
  { key: "residents" as const, icon: "Users" as const, href: "/residents", requiredRole: undefined },
  { key: "payments" as const, icon: "ReceiptText" as const, href: "/payments", requiredRole: undefined },
  { key: "collections" as const, icon: "Gift" as const, href: "/special-collections", requiredRole: undefined },
  { key: "reports" as const, icon: "FileSpreadsheet" as const, href: "/reports", requiredRole: undefined },
  { key: "settings" as const, icon: "Settings" as const, href: "/settings" },
];

export async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return <>{children}</>;
  }

  const t = await getDictionary();

  const navItems = allNavItems
    .filter((item) => !item.requiredRole || user.role === item.requiredRole)
    .map(({ key, icon, href }) => ({ label: t.nav[key], icon, href }));

  return (
    <>
      <div className="min-h-screen max-w-full overflow-x-hidden lg:grid lg:grid-cols-[280px_1fr] bg-slate-50">
        <NavSidebar navItems={navItems} user={{ name: user.name, role: user.role }} />
        <div className="min-w-0 w-full overflow-x-hidden overflow-y-auto">{children}</div>
      </div>
      <LoadingOverlay />
    </>
  );
}
