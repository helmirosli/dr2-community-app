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
    <form action={action} className="ui-card p-6">
      <h3 className="text-lg font-semibold text-slate-900">Add new user</h3>
      <p className="mt-1 text-sm text-slate-600">Create a new dashboard account with a specific role.</p>

      <div className="mt-6 grid gap-4">
        <label className="ui-label">
          Name
          <input
            className="ui-input text-sm"
            name="name"
            placeholder="Full name"
            required
            type="text"
          />
        </label>

        <label className="ui-label">
          Email
          <input
            className="ui-input text-sm"
            name="email"
            placeholder="email@example.com"
            required
            type="email"
          />
        </label>

        <label className="ui-label">
          Password
          <div className="relative">
            <input
              className="ui-input w-full pr-10 text-sm"
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

        <label className="ui-label">
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
          <div className={`flex items-start gap-3 ${
            state.ok
              ? "ui-alert-success"
              : "ui-alert-error"
          }`}>
            {state.ok ? (
              <CheckCircle2 className="shrink-0" size={18} />
            ) : (
              <AlertCircle className="shrink-0" size={18} />
            )}
            <p>{state.message}</p>
          </div>
        )}

        <button className="ui-button-primary" disabled={pending} type="submit">
          {pending ? "Creating..." : "Create user"}
        </button>
      </div>
    </form>
  );
}
