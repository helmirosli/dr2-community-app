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
          className="ui-input"
          name="email"
          placeholder={t.login.emailPlaceholder}
          required
          type="email"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-700">{t.login.password}</span>
        <input
          className="ui-input"
          name="password"
          placeholder={t.login.passwordPlaceholder}
          required
          type="password"
        />
      </label>

      {state.message ? (
        <p className="text-sm font-medium text-red-600">{state.message}</p>
      ) : null}

      <button className="ui-button-primary mt-1 w-full" disabled={pending} type="submit">
        {pending ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}
