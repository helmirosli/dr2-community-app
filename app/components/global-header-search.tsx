"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ReceiptText, Search, Users, type LucideIcon } from "lucide-react";

type GlobalSearchItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  type: "resident" | "payment" | "report";
};

const typeIcon: Record<GlobalSearchItem["type"], LucideIcon> = { resident: Users, payment: ReceiptText, report: FileSpreadsheet };
const typeTint: Record<GlobalSearchItem["type"], string> = {
  resident: "bg-[#e2f7e1] text-[#1c7a33]",
  payment: "bg-[#ddf5fd] text-[#0b6e8e]",
  report: "bg-[#eef0f4] text-[#5d6779]",
};

/** Spotlight-style search: ⌘K / Ctrl K or "/" to focus, arrows + Enter to pick, Esc to close. */
export function GlobalHeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GlobalSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform check after hydration
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!trimmedQuery) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmedQuery)}&limit=8`);
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
        setActive(0);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const showDropdown = open && trimmedQuery.length > 0;

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedQuery) return;
    goTo(items[active]?.href ?? `/residents?q=${encodeURIComponent(trimmedQuery)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <form onSubmit={onSubmit} role="search">
        <label className="group flex h-10 items-center gap-2.5 rounded-xl bg-black/[0.045] px-3.5 transition-all duration-200 hover:bg-black/[0.06] focus-within:bg-white focus-within:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)] focus-within:ring-1 focus-within:ring-black/5">
          <Search className="shrink-0 text-[#8e8e93] transition group-focus-within:text-[var(--blue)]" size={16} aria-hidden="true" />
          <span className="sr-only">Search</span>
          <input
            ref={inputRef}
            id="global-header-search"
            className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[#aeaeb2] [&::-webkit-search-cancel-button]:hidden"
            placeholder="Search"
            type="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="global-search-results"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="hidden shrink-0 rounded-md bg-white/80 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[#8e8e93] shadow-[0_1px_0_rgba(0,0,0,0.06)] group-focus-within:hidden sm:inline">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </label>
      </form>

      {showDropdown && (
        <div
          id="global-search-results"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl bg-white/95 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 backdrop-blur-xl"
        >
          {loading && items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--ink-2)]">Searching…</p>
          ) : items.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto p-1.5" role="listbox">
              {items.map((item, index) => {
                const Icon = typeIcon[item.type] ?? Search;
                return (
                  <li key={item.id} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => goTo(item.href)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${index === active ? "bg-[var(--paper)]" : ""}`}
                    >
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${typeTint[item.type] ?? typeTint.report}`}>
                        <Icon size={15} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">{item.label}</span>
                        <span className="block truncate text-xs text-[var(--ink-2)]">{item.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-[var(--ink-2)]">No results for “{trimmedQuery}”.</p>
          )}
          <p className="flex gap-3 border-t border-black/5 px-4 py-2 text-[11px] text-[#aeaeb2]">
            <span>↑↓ to move</span>
            <span>↵ to open</span>
            <span>esc to close</span>
          </p>
        </div>
      )}
    </div>
  );
}
