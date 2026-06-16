import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const [currentUser, userCount] = await Promise.all([
    getCurrentUser(),
    prisma.user.count(),
  ]);

  if (currentUser) {
    redirect("/dashboard");
  }

  if (userCount === 0) {
    redirect("/setup");
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Admin & AJK</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Resident submissions stay public, but dashboard review and official payment actions require committee access.
          </p>
        </div>
        <LoginForm />
        <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href="/submit">
          Open resident form
        </Link>
      </div>
    </main>
  );
}