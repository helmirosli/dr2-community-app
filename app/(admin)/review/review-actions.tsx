"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle, X } from "lucide-react";

function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? <LoaderCircle size={18} className="animate-spin" aria-label="Working" /> : children}
    </button>
  );
}

const Key = ({ k }: { k: string }) => (
  <kbd className="ml-1 hidden rounded border border-current px-1 text-[10px] leading-4 opacity-60 lg:inline">{k}</kbd>
);

/**
 * Approve / reject bar (spec §5.7). Approve is the main action; Reject first asks for a reason
 * in place, so the bar stays small and never covers the claim. Keys: A approve, R reject, Esc cancel.
 */
export function ReviewActions({
  approve,
  reject,
  labels,
}: {
  approve: (formData: FormData) => Promise<void>;
  reject: (formData: FormData) => Promise<void>;
  labels: { approve: string; reject: string; reason: string; confirmReject: string; cancel: string };
}) {
  const approveRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (rejecting) reasonRef.current?.focus();
  }, [rejecting]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setRejecting(false);
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        approveRef.current?.requestSubmit();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setRejecting(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bar = "sticky bottom-[76px] z-10 rounded-[28px] bg-white/90 p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4";

  if (rejecting) {
    return (
      <form action={reject} className={`${bar} grid gap-2.5 p-3.5`}>
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--ink-2)]">
          {labels.reason}
          <textarea ref={reasonRef} name="reason" required rows={2} className="ui-textarea !min-h-0 text-sm" />
        </label>
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button type="button" onClick={() => setRejecting(false)} className="min-h-12 rounded-full text-sm font-semibold text-[var(--ink-2)] transition hover:bg-black/5">
            {labels.cancel}
          </button>
          <Submit className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-[var(--due)] text-sm font-semibold text-white shadow-[0_4px_0_#b83a1a] transition hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#b83a1a]">
            <X size={16} aria-hidden="true" /> {labels.confirmReject}
          </Submit>
        </div>
      </form>
    );
  }

  return (
    <div data-tour="review-actions" className={`${bar} grid grid-cols-[1fr_2fr] gap-2.5`}>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-[#c2341a] ring-1 ring-inset ring-[#ffc9bc] transition hover:bg-[#fff4f1] active:scale-[0.98]"
      >
        <X size={16} aria-hidden="true" /> {labels.reject}
        <Key k="R" />
      </button>
      <form ref={approveRef} action={approve}>
        <Submit className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--leaf)] font-heading text-[15px] font-semibold text-white shadow-[0_4px_0_#1f8a37] transition hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#1f8a37]">
          <Check size={18} aria-hidden="true" /> {labels.approve}
          <Key k="A" />
        </Submit>
      </form>
    </div>
  );
}
