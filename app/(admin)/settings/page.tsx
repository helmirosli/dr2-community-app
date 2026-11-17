import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsPage() {
  const currentUser = await requireDashboardUser();

  const t = await getDictionary();

  const userResult = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { passwordHash: true },
  });
  const currentUserPasswordHash = userResult?.passwordHash ?? "";

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return <SettingsView t={t} currentUser={currentUser} passwordHash={currentUserPasswordHash} users={users} />;
}
