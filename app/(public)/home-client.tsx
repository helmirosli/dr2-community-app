"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UnitLookup({ label, placeholder, button }: { label: string; placeholder: string; button: string }) {
  const router = useRouter();
  const [unit, setUnit] = useState("");

  return (
    <form
      className="flex w-full max-w-md items-stretch gap-2 rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 focus-within:ring-2 focus-within:ring-[var(--cyan)]"
      onSubmit={(e) => {
        e.preventDefault();
        const value = unit.trim();
        if (!value) return;
        router.push(`/rumah/${encodeURIComponent(value)}`);
      }}
    >
      <label className="sr-only" htmlFor="unit-lookup">
        {label}
      </label>
      <input
        id="unit-lookup"
        inputMode="numeric"
        autoComplete="off"
        placeholder={`${label} · ${placeholder}`}
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-4 text-lg text-white placeholder:text-white/45 focus:outline-none"
      />
      <button type="submit" className="rounded-full bg-[var(--lime)] px-6 py-2.5 font-heading font-semibold text-[#06210b] hover:brightness-105">
        {button}
      </button>
    </form>
  );
}

export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s+/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
      className="rounded-full border border-[var(--line,#d2d2d7)] px-3 py-1 text-xs font-semibold text-[var(--blue)] hover:bg-[var(--paper)]"
      aria-live="polite"
    >
      {copied ? done : label}
    </button>
  );
}
