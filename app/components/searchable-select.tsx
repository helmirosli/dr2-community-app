"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

export function SearchableSelect({
  name,
  options,
  defaultValue,
  value,
  placeholder = "Select...",
  required,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option | null>(
    () => options.find((o) => o.value === (value ?? defaultValue)) ?? null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelected(options.find((o) => o.value === value) ?? null);
    }
  }, [value, options]);

  const filtered =
    query === ""
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.value ?? ""} />
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={`flex w-full px-4 py-2 text-left text-sm transition hover:bg-cyan-50 ${
                      selected?.value === option.value
                        ? "bg-cyan-50 font-medium text-cyan-700"
                        : "text-slate-700"
                    }`}
                    onClick={() => {
                      setSelected(option);
                      setOpen(false);
                      setQuery("");
                      onChange?.(option.value);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-slate-400">No results</li>
            )}
          </ul>
        </div>
      )}

      {required && !selected && (
        <input
          tabIndex={-1}
          className="absolute inset-0 opacity-0"
          required
          onFocus={() => setOpen(true)}
        />
      )}
    </div>
  );
}
