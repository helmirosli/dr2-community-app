"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Option = { value: string; label: string };

type SearchableDropdownProps = {
  name: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function SearchableDropdown({
  name,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Search...",
  required,
  className,
}: SearchableDropdownProps) {
  const controlled = value !== undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState(
    controlled ? value : defaultValue ?? ""
  );
  const [selectedLabel, setSelectedLabel] = useState(
    options.find((o) => o.value === (controlled ? value : defaultValue))?.label ?? ""
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

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
    return () =>
      document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (controlled && value !== selectedValue) {
      setSelectedValue(value);
      setSelectedLabel(
        options.find((o) => o.value === value)?.label ?? ""
      );
    }
  }, [controlled, value, selectedValue, options]);

  function handleSelect(option: Option) {
    setSelectedValue(option.value);
    setSelectedLabel(option.label);
    if (!controlled) onChange?.(option.value);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    const current = controlled ? value : selectedValue;
    if (!current) return;
    setSelectedValue("");
    setSelectedLabel("");
    if (!controlled) onChange?.("");
  }

  const hasValue = Boolean(controlled ? value : selectedValue);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        type="hidden"
        name={name}
        value={controlled ? value : selectedValue}
      />
      {required && !hasValue && (
        <input
          tabIndex={-1}
          className="absolute inset-0 opacity-0"
          required
          onFocus={() => setOpen(true)}
        />
      )}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={hasValue ? "text-slate-900" : "text-slate-400"}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
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
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-cyan-50 ${
                      (controlled ? value : selectedValue) === option.value
                        ? "bg-cyan-50 font-medium text-cyan-700"
                        : "text-slate-700"
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {(controlled ? value : selectedValue) === option.value && (
                      <span className="shrink-0 text-cyan-600">{"✓"}</span>
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-slate-400">
                {query ? "No results" : "No options available"}
              </li>
            )}
          </ul>

          {/* Selected indicator */}
          {hasValue && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              <span>{selectedLabel}</span>
              {!controlled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-medium text-cyan-600 hover:text-cyan-700"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
