import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SetupScreen } from "./setup-form";

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

  return <SetupScreen />;
}
