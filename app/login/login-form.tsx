"use client";

import { useActionState } from "react";

import { login, type AuthFormState } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/context";

const initialState: AuthFormState = {
  ok: false,
  message: "",
};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const { t } = useDictionary();

  return (
    <form action={action} className="grid gap-7">
      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-700">{t.login.email}</span>
        <input
          className="border-b border-slate-300 bg-transparent pb-2 pt-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none"
          name="email"
          placeholder={t.login.emailPlaceholder}
          required
          type="email"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-700">{t.login.password}</span>
        <input
          className="border-b border-slate-300 bg-transparent pb-2 pt-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none"
          name="password"
          placeholder={t.login.passwordPlaceholder}
          required
          type="password"
        />
      </label>

      {state.message ? (
        <p className="text-sm font-medium text-red-600">{state.message}</p>
      ) : null}

      <button
        className="mt-1 min-h-11 rounded-full bg-cyan-700 px-6 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}
