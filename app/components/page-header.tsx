import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Standard admin page header: optional back link, title, one-line subtitle, actions on the right.
 * Replaces the per-page breadcrumb + eyebrow + h1 blocks so every staff page lines up.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="grid gap-3">
      {back && (
        <Link href={back.href} className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline">
          <ChevronLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-[var(--ink)]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-[15px] text-[var(--ink-2)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Standard admin page frame: paper background, centred column, consistent spacing. */
export function AdminPage({ children, width = "wide" }: { children: React.ReactNode; width?: "wide" | "narrow" }) {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className={`mx-auto grid w-full gap-6 [&>*]:min-w-0 ${width === "narrow" ? "max-w-3xl" : "max-w-7xl"}`}>{children}</div>
    </main>
  );
}
