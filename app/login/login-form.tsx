"use client";

import { useActionState } from "react";

import { login, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = {
  ok: false,
  message: "",
};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Email
        <input className="rounded-md border border-slate-300 px-3 py-2" name="email" required type="email" />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Password
        <input className="rounded-md border border-slate-300 px-3 py-2" name="password" required type="password" />
      </label>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}