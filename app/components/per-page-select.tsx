"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

type PerPageSelectProps = {
  perPage: number;
  options?: number[];
};

export function PerPageSelect({ perPage, options = [10, 25, 50, 100] }: PerPageSelectProps) {
  const pathname = usePathname();
  const params   = useSearchParams();
  const router   = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(params.toString());
    sp.set("perPage", e.target.value);
    sp.set("page", "1");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <label className="relative inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-2)]">
      <span className="hidden sm:inline">Show</span>
      <select
        aria-label="Rows per page"
        className="h-8 appearance-none rounded-full bg-[var(--paper)] pl-3 pr-7 text-[13px] font-semibold text-[var(--ink)] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)]"
        value={perPage}
        onChange={handleChange}
      >
        {options.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 text-[var(--ink-2)]" size={12} aria-hidden="true" />
    </label>
  );
}
