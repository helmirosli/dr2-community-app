"use client";

import { useActionState } from "react";

import { createFirstAdmin, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = {
  ok: false,
  message: "",
};

export function SetupForm() {
  const [state, action, pending] = useActionState(createFirstAdmin, initialState);

  return (
    <form action={action} className="ui-card grid gap-5 p-6">
      <label className="ui-label">
        Name
        <input className="ui-input" name="name" required />
      </label>

      <label className="ui-label">
        Email
        <input className="ui-input" name="email" required type="email" />
      </label>

      <label className="ui-label">
        Password
        <input className="ui-input" minLength={8} name="password" required type="password" />
      </label>

      <label className="ui-label">
        Confirm password
        <input className="ui-input" minLength={8} name="confirmPassword" required type="password" />
      </label>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="ui-button-primary" disabled={pending} type="submit">
        {pending ? "Creating admin..." : "Create first admin"}
      </button>
    </form>
  );
}