"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { GlobalHeaderSearch } from "@/app/components/global-header-search";
import { useLivePendingCount } from "./use-pending-count";

/**
 * Desktop admin header: greeting + date on the left, Spotlight-style search in the centre,
 * live review bell and the signed-in user on the right.
 */
export function AdminHeader({
  greeting,
  date,
  user,
  pendingCount: initialPending,
  reviewLabel,
}: {
  greeting: string;
  date: string;
  user: { name: string; role: string; initials: string };
  pendingCount: number;
  reviewLabel: string;
}) {
  const pathname = usePathname();
  const pending = useLivePendingCount(initialPending, pathname);

  return (
    <header className="sticky top-0 z-20 hidden border-b border-black/5 bg-[var(--paper)]/80 backdrop-blur-xl backdrop-saturate-150 lg:block">
      <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_minmax(0,30rem)_1fr] items-center gap-6 px-8">
        <div className="min-w-0 leading-tight">
          <p className="truncate font-heading text-[15px] font-semibold text-[var(--ink)]">{greeting}</p>
          <p className="truncate text-xs text-[var(--ink-2)]">{date}</p>
        </div>

        <GlobalHeaderSearch />

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/review"
            aria-label={`${reviewLabel}${pending ? ` (${pending})` : ""}`}
            title={reviewLabel}
            className="relative grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5 hover:text-[var(--ink)]"
          >
            <Bell size={19} aria-hidden="true" />
            {pending > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--due)] px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-[var(--paper)]">
                {pending}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-black/5">
            <span className="grid size-8 place-items-center rounded-full bg-[image:var(--blend)] text-[11px] font-bold text-[#06210b]">
              {user.initials}
            </span>
            <span className="hidden leading-tight xl:block">
              <span className="block max-w-36 truncate text-[13px] font-semibold text-[var(--ink)]">{user.name}</span>
              <span className="block text-[11px] capitalize text-[var(--ink-2)]">{user.role.toLowerCase()}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
