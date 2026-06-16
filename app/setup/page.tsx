import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SetupPage() {
  const [currentUser, userCount] = await Promise.all([
    getCurrentUser(),
    prisma.user.count(),
  ]);

  if (currentUser) {
    redirect("/dashboard");
  }

  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#f6fafb] px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md content-center gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">First run setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create the first admin</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This setup page is available only while the user table is empty.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}