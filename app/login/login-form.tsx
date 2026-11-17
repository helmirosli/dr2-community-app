"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, ChevronLeft, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail, TriangleAlert } from "lucide-react";

import { GuardhouseScene } from "@/app/components/guardhouse-scene";
import { LocaleToggle } from "@/app/components/locale-toggle";
import { login, type AuthFormState } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/context";

const initialState: AuthFormState = { ok: false, message: "" };

// The guardhouse lamp tells you how sign-in is going.
const LAMP = { idle: "34,199,242", busy: "142,229,63", error: "255,90,54" };

const FIELD =
  "h-12 w-full rounded-2xl bg-[var(--paper)] pl-11 pr-4 text-[15px] text-[var(--ink)] outline-none ring-1 ring-black/5 transition placeholder:text-[#aeaeb2] focus:bg-white focus:ring-2 focus:ring-[var(--cyan)]";

/** The whole sign-in screen: the guardhouse scene beside a sign-in card, on the night background. */
export function LoginStage() {
  const [state, action, pending] = useActionState(login, initialState);
  const { t } = useDictionary();
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  // An error stays until the person starts typing again; a new result brings it back.
  const [dismissed, setDismissed] = useState<AuthFormState | null>(null);
  const showError = Boolean(state.message) && dismissed !== state;
  const lamp = pending ? LAMP.busy : showError ? LAMP.error : LAMP.idle;

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[var(--night)] text-white">
      <span aria-hidden="true" className="pointer-events-none absolute -left-40 top-1/4 -z-10 size-[36rem] rounded-full bg-[radial-gradient(circle,rgba(34,199,242,.16),transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 -z-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(142,229,63,.12),transparent_70%)]" />

      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-1 rounded-full py-1.5 pr-3 text-sm font-medium text-[#c7cedd] transition hover:text-white">
          <ChevronLeft size={16} aria-hidden="true" />
          {t.login.backHome}
        </Link>
        <LocaleToggle dark />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-2 px-5 pb-8 sm:px-8 md:grid-cols-2 md:gap-12">
        <section className="grid justify-items-center gap-3 text-center">
          <GuardhouseScene lamp={lamp} plate="AJK" fireflies className="w-[min(230px,60vw)] md:w-[min(440px,100%,50vh)]" />
          <div className="grid gap-1">
            <p className="text-sm text-[#a1a1a6]">{t.login.welcomeTo}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{t.login.communityName}</h1>
            <p className="text-blend mx-auto mt-1 max-w-xs font-heading text-sm font-semibold">{t.login.tagline}</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="animate-pop relative mt-12 flow-root rounded-[32px] bg-white px-7 pb-8 text-[var(--ink)] shadow-[0_40px_80px_-20px_rgba(0,0,0,.65)] ring-1 ring-white/20 sm:px-9">
            <div className="-mt-10 mb-5 grid justify-items-center">
              <Image
                src="/jr2-logo.jpeg"
                alt="Desa Restu 2 @ Sepang"
                width={80}
                height={80}
                className="rounded-full ring-4 ring-white shadow-[0_14px_30px_-8px_rgba(36,99,232,.55)]"
                priority
              />
            </div>
            <h2 className="text-center font-heading text-3xl font-bold tracking-tight">{t.login.title}</h2>
            <p className="mt-1 text-center text-sm text-[var(--ink-2)]">{t.login.subtitle}</p>

            <form action={action} className="mt-7 grid gap-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.login.email}</span>
                <span className="relative block">
                  <Mail size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-2)]" />
                  <input
                    className={FIELD}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t.login.emailPlaceholder}
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setDismissed(state);
                    }}
                  />
                </span>
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">{t.login.password}</span>
                <span className="relative block">
                  <Lock size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-2)]" />
                  <input
                    className={`${FIELD} !pr-12`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t.login.passwordPlaceholder}
                    required
                    onChange={() => setDismissed(state)}
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </span>
                {capsLock && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#8a6300]">
                    <TriangleAlert size={13} aria-hidden="true" />
                    {t.login.capsLock}
                  </span>
                )}
              </label>

              {showError && (
                <p key={state.message} role="alert" className="animate-shake flex items-start gap-2 rounded-2xl bg-[#ffe6e0] px-4 py-3 text-sm font-medium text-[#c2341a]">
                  <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {state.message}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--blue)] font-heading font-semibold text-white shadow-[0_4px_0_#1a47b0,0_16px_30px_-10px_rgba(36,99,232,.6)] transition hover:brightness-110 active:translate-y-[3px] active:shadow-[0_1px_0_#1a47b0] disabled:opacity-80"
              >
                {pending ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                    {t.login.submitting}
                  </>
                ) : (
                  <>
                    {t.login.submit}
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 grid justify-items-center gap-2 border-t border-black/5 pt-5 text-center">
              <p className="text-xs text-[var(--ink-2)]">{t.login.residentNote}</p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
                <Link className="font-medium text-[var(--blue)] hover:underline" href="/status">
                  {t.publicLayout.status} ›
                </Link>
                <Link className="font-medium text-[var(--blue)] hover:underline" href="/submit">
                  {t.home.submitTitle} ›
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
