"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { createUser } from "@/lib/actions/user-management";
import { SearchableDropdown } from "@/app/components/searchable-dropdown";

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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Add new user</h3>
      <p className="mt-1 text-sm text-slate-600">Create a new dashboard account with a specific role.</p>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Name
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            name="name"
            placeholder="Full name"
            required
            type="text"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            name="email"
            placeholder="email@example.com"
            required
            type="email"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Password
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 pr-10"
              name="password"
              placeholder="Strong password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Role
          <SearchableDropdown
            name="role"
            options={[
              { value: "AJK", label: "AJK (Committee member)" },
              { value: "ADMIN", label: "Admin (Can manage users)" },
              { value: "VIEWER", label: "Viewer (Read-only access)" },
            ]}
            defaultValue="AJK"
            required
          />
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
          className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating..." : "Create user"}
        </button>
      </div>
    </form>
  );
}
