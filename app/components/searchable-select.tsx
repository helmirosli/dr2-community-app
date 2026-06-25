"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  ariaLabel?: string;
};

export function SearchableSelect({
  name,
  options,
  defaultValue,
  value,
  placeholder = "Select...",
  required,
  onChange,
  ariaLabel,
}: SearchableSelectProps) {
  const controlled = value !== undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option | null>(
    () => options.find((o) => o.value === defaultValue) ?? null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const currentSelected = controlled
    ? options.find((o) => o.value === value) ?? null
    : selected;

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
      <input type="hidden" name={name} value={currentSelected?.value ?? ""} />
      <button
        type="button"
        className="flex w-full items-center justify-between ui-input text-left text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel ?? `${name} selector`}
      >
        <span className={currentSelected ? "text-slate-900" : "text-slate-400"}>
          {currentSelected?.label ?? placeholder}
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
              aria-label={`Search ${ariaLabel ?? name} options`}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox" id={listboxId}>
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={`flex w-full px-4 py-2 text-left text-sm transition hover:bg-brand-50 ${
                      currentSelected?.value === option.value
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-slate-700"
                    }`}
                    onClick={() => {
                      setSelected(option);
                      setOpen(false);
                      setQuery("");
                      onChange?.(option.value);
                    }}
                    role="option"
                    aria-selected={currentSelected?.value === option.value}
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

      {required && !currentSelected && (
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
