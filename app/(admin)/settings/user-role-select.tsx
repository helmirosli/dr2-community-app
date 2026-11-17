"use client";

import { useState, useTransition } from "react";

import { updateUserRole } from "@/lib/actions/user-management";
import { ROLES } from "./roles";

type UserRoleSelectProps = {
  userId: string;
  currentRole: string;
};

/** Segmented role picker: tapping a role saves it straight away. */
export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const [pending, startTransition] = useTransition();

  const choose = (value: string) => {
    if (value === role) return;
    const previous = role;
    setRole(value);
    startTransition(async () => {
      const result = await updateUserRole(userId, value);
      if (!result.ok) setRole(previous);
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Role"
      className={`inline-flex rounded-full bg-[#eef0f4] p-1 transition ${pending ? "opacity-60" : ""}`}
    >
      {ROLES.map((r) => {
        const selected = role === r.value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={r.hint}
            disabled={pending}
            onClick={() => choose(r.value)}
            className={`min-h-10 rounded-full px-3.5 text-xs font-semibold transition ${
              selected ? `${r.tone} shadow-sm ring-1 ring-black/5` : "text-[var(--ink-2)] hover:text-[var(--ink)]"
            }`}
          >
            {r.title}
          </button>
        );
      })}
    </div>
  );
}
