"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Length-only hint, client side. ponytail: no entropy check, the server only enforces min 8.
const LEVELS = [
  { min: 0, label: "Too short — use at least 8 characters", bar: "bg-[#c2341a]", text: "text-[#c2341a]", fill: 1 },
  { min: 8, label: "Okay — longer is safer", bar: "bg-[var(--amber)]", text: "text-[#8a6300]", fill: 2 },
  { min: 12, label: "Good", bar: "bg-[var(--cyan)]", text: "text-[#0b6e8e]", fill: 3 },
  { min: 16, label: "Strong", bar: "bg-[var(--leaf)]", text: "text-[#1c7a33]", fill: 4 },
];

type PasswordFieldProps = {
  label: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  /** Show the length-based strength meter under the field. */
  strength?: boolean;
};

export function PasswordField({ label, name, placeholder, autoComplete, minLength, strength }: PasswordFieldProps) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [length, setLength] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const level = [...LEVELS].reverse().find((l) => length >= l.min)!;

  // React resets the form after each submit; keep the meter in sync with the emptied field.
  useEffect(() => {
    const form = ref.current?.form;
    const onReset = () => setLength(0);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, []);

  return (
    <div className="ui-label">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="ui-input w-full !py-3 !pr-12 !text-lg"
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          type={show ? "text" : "password"}
          ref={ref}
          onChange={(e) => setLength(e.target.value.length)}
        />
        <button
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-[var(--ink-2)] hover:bg-black/5 hover:text-[var(--ink)]"
          onClick={() => setShow(!show)}
          type="button"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {strength && (
        <div aria-live="polite" className="grid gap-1.5">
          <div aria-hidden="true" className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 rounded-full ${length > 0 && i <= level.fill ? level.bar : "bg-[#eef0f4]"}`} />
            ))}
          </div>
          <span className={`text-xs font-medium ${length > 0 ? level.text : "text-[var(--ink-2)]"}`}>
            {length > 0 ? level.label : "At least 8 characters. A short sentence is easy to remember."}
          </span>
        </div>
      )}
    </div>
  );
}
