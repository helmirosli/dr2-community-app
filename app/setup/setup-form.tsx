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
    <form action={action} className="grid gap-5 rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Name
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" name="name" required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Email
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" name="email" required type="email" />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Password
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" minLength={8} name="password" required type="password" />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Confirm password
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" minLength={8} name="confirmPassword" required type="password" />
      </label>

      {state.message ? <p className="text-sm text-red-600">{state.message}</p> : null}

      <button className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Creating admin..." : "Create first admin"}
      </button>
    </form>
  );
}