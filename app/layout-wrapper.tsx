import { getDictionary } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { LoadingOverlay } from "./components/loading-overlay";
import { GlobalHeaderSearch } from "./components/global-header-search";
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

  const navSections = [
    {
      title: "Overview",
      items: navItems.filter((item) => item.href === "/dashboard"),
    },
    {
      title: "Resident Management",
      items: navItems.filter((item) => item.href === "/residents"),
    },
    {
      title: "Operations",
      items: navItems
        .filter((item) => item.href === "/payments" || item.href === "/special-collections")
        .map((item) => (item.href === "/payments" ? { ...item, highlight: true } : item)),
    },
    {
      title: "Reporting",
      items: navItems.filter((item) => item.href === "/reports"),
    },
    {
      title: "Administration",
      items: navItems.filter((item) => item.href === "/settings"),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <>
      <div className="min-h-screen max-w-full overflow-x-hidden lg:grid lg:grid-cols-[280px_1fr] bg-[var(--background)]">
        <NavSidebar navSections={navSections} user={{ name: user.name, role: user.role }} />
        <div className="min-w-0 w-full overflow-x-hidden overflow-y-auto">
          <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 backdrop-blur lg:block">
            <div className="mx-auto flex w-full max-w-7xl items-center px-6 py-3">
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
