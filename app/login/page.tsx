import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginStage } from "./login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LoginPage() {
  const [currentUser, userCount] = await Promise.all([getCurrentUser(), prisma.user.count()]);

  if (currentUser) redirect("/dashboard");
  if (userCount === 0) redirect("/setup");

  return <LoginStage />;
}
