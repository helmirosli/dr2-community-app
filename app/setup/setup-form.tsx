"use client";

import Image from "next/image";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { PasswordField } from "@/app/(admin)/settings/password-field";
import { createFirstAdmin, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = {
  ok: false,
  message: "",
};

export function SetupForm() {
  const [state, action, pending] = useActionState(createFirstAdmin, initialState);

  return (
    <form action={action} className="grid gap-5">
      <label className="ui-label">
        Your name
        <input className="ui-input !py-3 !text-lg" name="name" placeholder="e.g. Ahmad bin Ali" autoComplete="name" required />
      </label>

      <label className="ui-label">
        Email
        <input className="ui-input !py-3 !text-lg" name="email" placeholder="name@example.com" autoComplete="email" required type="email" />
      </label>

      <PasswordField label="Password" name="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} strength />
      <PasswordField label="Confirm password" name="confirmPassword" placeholder="Type it again" autoComplete="new-password" minLength={8} />

      {state.message ? (
        <div className="ui-alert-error flex items-start gap-3">
          <AlertCircle className="shrink-0" size={18} />
          <p>{state.message}</p>
        </div>
      ) : null}

      <button className="ui-button-primary mt-1 w-full !py-3" disabled={pending} type="submit">
        {pending ? "Creating admin…" : "Create admin and sign in"}
      </button>
    </form>
  );
}

/** Presentational first-run screen (night art panel + form), matches /login. */
export function SetupScreen() {
  return (
    <main className="flex min-h-screen flex-col bg-white md:flex-row">
      {/* Left: night panel with the guardhouse art (A2) */}
      <div className="relative flex min-h-64 flex-col items-center justify-end overflow-hidden bg-[var(--night)] px-10 pb-10 pt-16 text-white md:min-h-screen md:w-1/2 md:justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative art, fills the panel */}
        <img src="/art/a2-login.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--night)] via-[var(--night)]/40 to-transparent" />
        <div className="relative flex flex-col items-center text-center md:mt-auto md:pb-6">
          <Image src="/jr2-logo.jpeg" alt="Desa Restu 2 @ Sepang" width={84} height={84} className="rounded-full ring-2 ring-white/20" priority />
          <p className="mt-4 text-sm text-white/70">Welcome — let&apos;s get started</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">Desa Restu 2</h1>
          <p className="text-blend mt-2 max-w-xs font-heading text-sm font-semibold">One quick step and the dashboard is yours.</p>
        </div>
      </div>

      {/* Right: create the first admin */}
      <div className="flex flex-col items-center justify-center bg-white px-6 py-14 sm:px-8 md:w-1/2">
        <div className="w-full max-w-sm">
          <span className="ui-chip bg-[#ddf5fd] text-[#0b6e8e]">First-run setup</span>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Create the first admin</h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            This account can add the rest of the team later. This page only works while there are no users yet.
          </p>

          <div className="mt-8">
            <SetupForm />
          </div>
        </div>
      </div>
    </main>
  );
}
