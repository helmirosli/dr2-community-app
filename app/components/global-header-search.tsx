"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type GlobalSearchItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  type: "resident" | "payment" | "report";
};

export function GlobalHeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GlobalSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmedQuery)}&limit=8`);
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const showDropdown = useMemo(() => open && trimmedQuery.length > 0, [open, trimmedQuery]);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedQuery) return;
    if (items[0]) {
      goTo(items[0].href);
      return;
    }
    goTo(`/residents?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <div className="relative w-full max-w-sm" ref={containerRef}>
      <form onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="global-header-search">
          Search
        </label>
        <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 transition focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
          <Search className="text-slate-400" size={15} />
          <input
            id="global-header-search"
            aria-label="Search"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search residents, payments, reports..."
            type="search"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </form>

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
          ) : items.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => goTo(item.href)}
                  >
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    <span className="text-xs text-slate-500">{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">No results found.</p>
          )}
        </div>
      )}
    </div>
  );
}
