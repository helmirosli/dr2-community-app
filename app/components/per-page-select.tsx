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
    <div className="relative inline-flex items-center">
      <select
        className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        value={perPage}
        onChange={handleChange}
      >
        {options.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 text-slate-400" size={12} />
    </div>
  );
}
