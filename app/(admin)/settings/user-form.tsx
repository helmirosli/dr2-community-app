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
    <form action={action} className="ui-card ui-form-section">
      <div>
        <h3 className="ui-section-title">Add new user</h3>
        <p className="ui-hint mt-1">Create a new dashboard account with a specific role.</p>
      </div>

      <div className="grid gap-4">
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
              className="absolute right-1 top-1/2 -translate-y-1/2 grid size-8 place-items-center text-[var(--ink-2)] hover:text-[var(--ink)]"
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

        <button className="ui-button-primary w-fit" disabled={pending} type="submit">
          {pending ? "Creating..." : "Create user"}
        </button>
      </div>
    </form>
  );
}
