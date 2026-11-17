"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";

import { createUser } from "@/lib/actions/user-management";
import { PasswordField } from "./password-field";
import { ROLES, type Role } from "./roles";

type FormState = {
  ok: boolean;
  message: string;
};

const initialState: FormState = {
  ok: false,
  message: "",
};

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, initialState);
  const [role, setRole] = useState<Role>("AJK");

  return (
    <form action={action} className="grid gap-4">
      <div>
        <h3 className="ui-section-title">Add a team member</h3>
        <p className="ui-hint mt-0.5">They sign in with this email and password.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="ui-label">
          Name
          <input className="ui-input !py-3 !text-lg" name="name" placeholder="e.g. Siti Aminah" required autoComplete="off" type="text" />
        </label>
        <label className="ui-label">
          Email
          <input className="ui-input !py-3 !text-lg" name="email" placeholder="name@example.com" required autoComplete="off" type="email" />
        </label>
      </div>

      <PasswordField label="Password" name="password" placeholder="At least 8 characters" autoComplete="new-password" strength />

      <div className="grid gap-2">
        <span className="ui-label">Role</span>
        <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Role">
          {ROLES.map((r) => {
            const selected = role === r.value;
            const Icon = r.icon;
            return (
              <label
                key={r.value}
                className={`relative flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition sm:flex-col sm:items-start ${
                  selected ? "bg-white shadow-[0_6px_20px_-10px_rgba(36,99,232,0.5)] ring-2 ring-[var(--blue)]" : "bg-[var(--paper)] ring-transparent hover:ring-black/10"
                }`}
              >
                <input type="radio" name="role" value={r.value} checked={selected} onChange={() => setRole(r.value)} className="sr-only" />
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${r.tone}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 pr-5 sm:pr-0">
                  <span className="block text-sm font-semibold text-[var(--ink)]">{r.title}</span>
                  <span className="block text-xs text-[var(--ink-2)]">{r.hint}</span>
                </span>
                {selected && (
                  <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[var(--blue)] text-white">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {state.message && (
        <div className={`flex items-start gap-3 ${state.ok ? "ui-alert-success" : "ui-alert-error"}`}>
          {state.ok ? <CheckCircle2 className="shrink-0" size={18} /> : <AlertCircle className="shrink-0" size={18} />}
          <p>{state.message}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button className="ui-button-primary min-w-40" disabled={pending} type="submit">
          {pending ? "Adding…" : "Add team member"}
        </button>
      </div>
    </form>
  );
}
