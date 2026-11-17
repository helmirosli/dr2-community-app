"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { changePassword } from "@/lib/actions/user-management";
import { PasswordField } from "./password-field";

type FormState = {
  ok: boolean;
  message: string;
};

const initialState: FormState = {
  ok: false,
  message: "",
};

type ChangePasswordFormProps = {
  userId: string;
  passwordHash: string;
};

/** Renders inside the "Your account" card (no card of its own). */
export function ChangePasswordForm({ userId, passwordHash }: ChangePasswordFormProps) {
  const [state, action, pending] = useActionState(changePassword, initialState);

  if (!passwordHash) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--paper)] p-4">
        <KeyRound size={18} className="shrink-0 text-[var(--ink-2)]" aria-hidden="true" />
        <p className="ui-hint">Password reset is available to logged-in users.</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div>
        <h3 className="ui-section-title">Change password</h3>
        <p className="ui-hint mt-0.5">Update the password you use to sign in.</p>
      </div>

      <input type="hidden" name="userId" value={userId} />

      <PasswordField label="Current password" name="currentPassword" placeholder="Your current password" autoComplete="current-password" />
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <PasswordField label="New password" name="newPassword" placeholder="At least 8 characters" autoComplete="new-password" strength />
        <PasswordField label="Confirm new password" name="confirmPassword" placeholder="Type it again" autoComplete="new-password" />
      </div>

      {state.message && (
        <div className={`flex items-start gap-3 ${state.ok ? "ui-alert-success" : "ui-alert-error"}`}>
          {state.ok ? <CheckCircle2 className="shrink-0" size={18} /> : <AlertCircle className="shrink-0" size={18} />}
          <p>{state.message}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button className="ui-button-primary min-w-40" disabled={pending} type="submit">
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
