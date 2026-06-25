"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  ariaLabel?: string;
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
  ariaLabel,
}: SearchableDropdownProps) {
  const controlled = value !== undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState(defaultValue ?? "");
  const [selectedLabel, setSelectedLabel] = useState(
    options.find((o) => o.value === defaultValue)?.label ?? "",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

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

  const currentValue = controlled ? (value ?? "") : selectedValue;
  const currentLabel = controlled
    ? options.find((o) => o.value === value)?.label ?? ""
    : selectedLabel;

  function handleSelect(option: Option) {
    setSelectedValue(option.value);
    setSelectedLabel(option.label);
    onChange?.(option.value);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    const current = currentValue;
    if (!current) return;
    setSelectedValue("");
    setSelectedLabel("");
    onChange?.("");
  }

  const hasValue = Boolean(currentValue);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        type="hidden"
        name={name}
        value={currentValue}
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
        className="flex w-full items-center justify-between ui-input text-left text-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel ?? `${name} selector`}
      >
        <span className={hasValue ? "text-slate-900" : "text-slate-400"}>
          {currentLabel || placeholder}
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

          {/* Options */}
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox" id={listboxId}>
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-brand-50 ${
                      currentValue === option.value
                          ? "bg-brand-50 font-medium text-brand-700"
                        : "text-slate-700"
                    }`}
                    onClick={() => handleSelect(option)}
                    role="option"
                    aria-selected={currentValue === option.value}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {currentValue === option.value && (
                      <span className="shrink-0 text-brand-700">{"✓"}</span>
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
              <span>{currentLabel}</span>
              {(!controlled || onChange) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-medium text-brand-700 hover:opacity-90"
                  aria-label="Clear selected option"
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
