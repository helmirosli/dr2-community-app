"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type SearchSelectProps = {
  name: string;
  searchUrl: string;
  placeholder?: string;
  required?: boolean;
  displayFormat?: (name: string, unit: string) => string;
  className?: string;
  ariaLabel?: string;
};

function defaultDisplayFormat(personName: string, unit: string) {
  return `${unit} - ${personName}`;
}

export function SearchSelect({
  name,
  searchUrl,
  placeholder = "Search...",
  required,
  displayFormat,
  className,
  ariaLabel,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [results, setResults] = useState<
    Array<{ value: string; name: string; unit: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${searchUrl}?q=${encodeURIComponent(query)}&limit=20`,
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [open, query, searchUrl]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSelect(
    value: string,
    nameStr: string,
    unit: string,
  ) {
    setSelectedValue(value);
    setSelectedLabel((displayFormat ?? defaultDisplayFormat)(nameStr, unit));
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    setSelectedValue("");
    setSelectedLabel("");
    if (inputRef.current) inputRef.current.focus();
  }

  const hasValue = Boolean(selectedValue);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input type="hidden" name={name} value={selectedValue} />
      {required && !selectedValue && (
        <input tabIndex={-1} className="absolute inset-0 opacity-0" required onFocus={() => setOpen(true)} />
      )}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel ?? `${name} selector`}
      >
        <span className={hasValue ? "text-slate-900" : "text-slate-400"}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${ariaLabel ?? name} options`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Results */}
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox" id={listboxId}>
            {loading ? (
              <li className="px-4 py-3 text-sm text-slate-500">Searching...</li>
            ) : results.length > 0 ? (
              results.map((item) => (
                <li key={item.value}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-cyan-50 ${
                      selectedValue === item.value
                        ? "bg-cyan-50 font-medium text-cyan-700"
                        : "text-slate-700"
                    }`}
                    onClick={() =>
                      handleSelect(item.value, item.name, item.unit)
                    }
                    role="option"
                    aria-selected={selectedValue === item.value}
                  >
                    <span className="min-w-0 truncate">
                      {(displayFormat ?? defaultDisplayFormat)(item.name, item.unit)}
                    </span>
                    {selectedValue === item.value && (
                      <span className="shrink-0 text-cyan-600">{"✓"}</span>
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-slate-400">
                {query ? "No results" : "Start typing to search..."}
              </li>
            )}
          </ul>

          {/* Selected indicator */}
          {hasValue && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              <span>{selectedLabel}</span>
              <button
                type="button"
                onClick={handleClear}
                className="font-medium text-cyan-600 hover:text-cyan-700"
                aria-label="Clear selected option"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
