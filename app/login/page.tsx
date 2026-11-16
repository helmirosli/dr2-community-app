import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const [currentUser, userCount] = await Promise.all([
    getCurrentUser(),
    prisma.user.count(),
  ]);

  if (currentUser) redirect("/dashboard");
  if (userCount === 0) redirect("/setup");

  const t = await getDictionary();

  return (
    <main className="flex min-h-screen flex-col bg-white md:flex-row">
      {/* Left: night panel with the guardhouse art (A2) */}
      <div className="relative flex min-h-64 flex-col items-center justify-end overflow-hidden bg-[var(--night)] px-10 pb-10 pt-16 text-white md:min-h-screen md:w-1/2 md:justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative art, fills the panel */}
        <img src="/art/a2-login.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--night)] via-[var(--night)]/40 to-transparent" />
        <div className="relative flex flex-col items-center text-center md:mt-auto md:pb-6">
          <Image src="/jr2-logo.jpeg" alt="Desa Restu 2 @ Sepang" width={84} height={84} className="rounded-full ring-2 ring-white/20" priority />
          <p className="mt-4 text-sm text-white/70">{t.login.welcomeTo}</p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">{t.login.communityName}</h1>
          <p className="text-blend mt-2 max-w-xs font-heading text-sm font-semibold">{t.login.tagline}</p>
        </div>
      </div>

      {/* Right — sign in form */}
      <div className="flex flex-col items-center justify-center bg-white px-8 py-16 md:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900">{t.login.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <div className="mt-6 flex justify-center gap-4 text-sm">
            <Link className="font-medium text-[var(--blue)] hover:underline" href="/status">
              {t.publicLayout.status} ›
            </Link>
            <Link className="font-medium text-[var(--blue)] hover:underline" href="/submit">
              {t.home.submitTitle} ›
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
