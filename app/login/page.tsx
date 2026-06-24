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
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Left — branding panel */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-900 px-10 py-16 text-white md:w-1/2 shadow-lg">
        {/* Logo circle */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-sm ring-4 ring-white/30">
          <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>

        <p className="text-base font-light tracking-wide text-white/80">{t.login.welcomeTo}</p>
        <h1 className="mt-1 text-center text-3xl font-bold tracking-tight">{t.login.communityName}</h1>
        <p className="mt-4 max-w-xs text-center text-sm leading-6 text-white/70">
          {t.login.tagline}
        </p>

        {/* Wave separator */}
        <div className="absolute right-0 top-0 hidden h-full md:block" style={{ width: 72 }}>
          <svg className="h-full w-full" viewBox="0 0 72 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="rgba(255,255,255,0.12)" d="M72,0 C12,100 12,200 72,300 C12,400 12,500 72,600 C12,700 12,750 72,800 L72,0Z" />
            <path fill="rgba(255,255,255,0.18)" d="M72,0 C20,110 20,220 72,330 C20,440 20,550 72,660 C20,730 20,780 72,800 L72,0Z" />
            <path fill="white" d="M72,0 C28,120 28,240 72,360 C28,480 28,600 72,720 C28,760 28,800 72,800 L72,0Z" />
          </svg>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-col items-center justify-center bg-white px-8 py-16 md:w-1/2 shadow-lg">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-slate-900">{t.login.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <Link
            className="mt-6 block text-sm font-medium text-cyan-700 hover:text-cyan-900"
            href="/submit"
          >
            {t.login.publicFormLink}
          </Link>
        </div>
      </div>
    </main>
  );
}
