"use client";

import { useEffect, useRef, useState } from "react";
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

const Key = ({ k }: { k: string }) => (
  <kbd className="ml-1 hidden rounded border border-current px-1 text-[10px] leading-4 opacity-60 lg:inline">{k}</kbd>
);

/**
 * Slim approve / reject bar (spec §5.7). Approve is the main action; Reject first asks for a reason
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

  const bar = "sticky bottom-[76px] z-10 rounded-[22px] bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4";

  if (rejecting) {
    return (
      <form action={reject} className={`${bar} grid gap-2 p-3`}>
        <label className="grid gap-1 text-xs font-semibold text-[var(--ink-2)]">
          {labels.reason}
          <textarea ref={reasonRef} name="reason" required rows={2} className="ui-textarea !min-h-0 text-sm" />
        </label>
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button type="button" onClick={() => setRejecting(false)} className="rounded-full py-2.5 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5">
            {labels.cancel}
          </button>
          <Submit className="flex items-center justify-center gap-1.5 rounded-full bg-[var(--due)] py-2.5 text-sm font-semibold text-white hover:brightness-95">
            <X size={16} aria-hidden="true" /> {labels.confirmReject}
          </Submit>
        </div>
      </form>
    );
  }

  return (
    <div className={`${bar} grid grid-cols-[1fr_2fr] gap-2`}>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        className="flex items-center justify-center gap-1.5 rounded-full py-3 text-sm font-semibold text-[#c2341a] ring-1 ring-inset ring-[#ffc9bc] hover:bg-[#fff4f1]"
      >
        <X size={16} aria-hidden="true" /> {labels.reject}
        <Key k="R" />
      </button>
      <form ref={approveRef} action={approve}>
        <Submit className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--leaf)] py-3 font-heading text-[15px] font-semibold text-white hover:brightness-105">
          <Check size={18} aria-hidden="true" /> {labels.approve}
          <Key k="A" />
        </Submit>
      </form>
    </div>
  );
}
