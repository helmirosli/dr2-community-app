"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

import { changePassword } from "@/lib/actions/user-management";

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

export function ChangePasswordForm({ userId, passwordHash }: ChangePasswordFormProps) {
  const [state, action, pending] = useActionState(changePassword, initialState);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!passwordHash) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Change password</h3>
        <p className="mt-1 text-sm text-slate-600">
          Password reset is available to logged-in users.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Change password</h3>
      <p className="mt-1 text-sm text-slate-600">
        Update your dashboard account password.
      </p>

      <input type="hidden" name="userId" value={userId} />

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Current password
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-10"
              name="currentPassword"
              placeholder="Enter your current password"
              required
              type={showCurrentPassword ? "text" : "password"}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              type="button"
            >
              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          New password
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-10"
              name="newPassword"
              placeholder="At least 8 characters"
              required
              type={showNewPassword ? "text" : "password"}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={() => setShowNewPassword(!showNewPassword)}
              type="button"
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Confirm new password
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-10"
              name="confirmPassword"
              placeholder="Re-enter your new password"
              required
              type={showConfirmPassword ? "text" : "password"}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              type="button"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {state.message && (
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}>
            {state.ok ? (
              <CheckCircle2 className="shrink-0" size={18} />
            ) : (
              <AlertCircle className="shrink-0" size={18} />
            )}
            <p>{state.message}</p>
          </div>
        )}

        <button
          className="self-start rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Updating..." : "Update password"}
        </button>
      </div>
    </form>
  );
}
