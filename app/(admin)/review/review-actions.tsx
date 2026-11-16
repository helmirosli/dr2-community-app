"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Check, X } from "lucide-react";

function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "…" : children}
    </button>
  );
}

/** Approve / reject bar with A and R keyboard shortcuts (spec §5.7). */
export function ReviewActions({
  approve,
  reject,
  labels,
}: {
  approve: (formData: FormData) => Promise<void>;
  reject: (formData: FormData) => Promise<void>;
  labels: { approve: string; reject: string; reason: string; shortcuts: string };
}) {
  const approveRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        approveRef.current?.requestSubmit();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        reasonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sticky bottom-[72px] z-10 grid gap-3 rounded-3xl bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5 backdrop-blur lg:bottom-4">
      <form action={reject} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-semibold text-[var(--ink-2)]">
          {labels.reason}
          <textarea ref={reasonRef} name="reason" required rows={1} className="ui-textarea !min-h-0 text-sm" />
        </label>
        <Submit className="ui-button-danger">
          <X size={16} aria-hidden="true" /> {labels.reject} <kbd className="ml-1 rounded border border-current px-1 text-[10px] opacity-60">R</kbd>
        </Submit>
      </form>
      <form ref={approveRef} action={approve}>
        <Submit className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--leaf)] px-5 py-3 font-heading font-semibold text-white hover:brightness-105">
          <Check size={18} aria-hidden="true" /> {labels.approve} <kbd className="ml-1 rounded border border-current px-1 text-[10px] opacity-70">A</kbd>
        </Submit>
      </form>
      <p className="hidden text-center text-[11px] text-[var(--ink-2)] lg:block">{labels.shortcuts}</p>
    </div>
  );
}
