"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";

export function UnitLookup({ label, placeholder, button }: { label: string; placeholder: string; button: string }) {
  const router = useRouter();
  const [unit, setUnit] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full max-w-md items-stretch gap-2 rounded-full bg-white/10 p-1.5 shadow-[0_20px_40px_-20px_rgba(34,199,242,.35)] ring-1 ring-white/15 backdrop-blur transition focus-within:ring-2 focus-within:ring-[var(--cyan)]"
      onSubmit={(e) => {
        e.preventDefault();
        const value = unit.trim();
        if (!value) return;
        // Stay in a transition so the button can show it is working while the house page loads.
        startTransition(() => router.push(`/rumah/${encodeURIComponent(value)}`));
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
      <button
        type="submit"
        disabled={pending}
        className="grid min-w-24 place-items-center rounded-full bg-[var(--lime)] px-6 py-2.5 font-heading font-semibold text-[#06210b] shadow-[0_3px_0_#4d9a12] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#4d9a12] disabled:opacity-80"
      >
        {pending ? <LoaderCircle size={20} className="animate-spin" aria-label="Loading" /> : button}
      </button>
    </form>
  );
}

/** Copy button for the dark bank card. */
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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 transition active:scale-95 ${
        copied ? "bg-[var(--lime)] text-[#06210b] ring-[var(--lime)]" : "bg-white/10 text-white ring-white/15 hover:bg-white/20"
      }`}
      aria-live="polite"
    >
      {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
      {copied ? done : label}
    </button>
  );
}
