import { Shield } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";

import { requireDashboardUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "./change-password-form";
import { UserForm } from "./user-form";
import { UserRoleSelect } from "./user-role-select";
import { DeleteUserButton } from "./delete-user-button";

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

  const roleLabels: Record<string, string> = {
    ADMIN: `Admin (${t.settings.adminDesc})`,
    AJK: `AJK (${t.settings.ajkDesc})`,
    VIEWER: `Viewer (${t.settings.viewerDesc})`,
  };

  return (
    <AdminPage width="narrow">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      {/* My account */}
      <section className="grid gap-3">
        <h2 className="ui-section-title">My Account</h2>
        <ChangePasswordForm userId={currentUser.id} passwordHash={currentUserPasswordHash} />
      </section>

      {/* User management — admin only */}
      {currentUser.role === "ADMIN" && (
        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="ui-section-title flex items-center gap-1.5">
              <Shield size={16} className="text-[var(--ink-2)]" />
              {t.settings.userManagement}
            </h2>
            <span className="ui-hint">{users.length} user{users.length !== 1 ? "s" : ""}</span>
          </div>

          <UserForm />

          <div className="ui-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ui-table min-w-160">
                <thead>
                  <tr>
                    <th>{t.settings.name}</th>
                    <th>{t.settings.email}</th>
                    <th>{t.settings.role}</th>
                    <th>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="font-semibold text-[var(--ink)]">
                        {user.name}
                        {user.id === currentUser.id && (
                          <span className="ml-2 text-xs font-normal text-[var(--ink-2)]">{t.settings.thisIsYou}</span>
                        )}
                      </td>
                      <td className="text-[var(--ink-2)]">{user.email}</td>
                      <td>
                        {user.id === currentUser.id ? (
                          <span className="ui-chip bg-[#ddf5fd] text-[#0b6e8e]">
                            {roleLabels[user.role] || user.role}
                          </span>
                        ) : (
                          <UserRoleSelect userId={user.id} currentRole={user.role} />
                        )}
                      </td>
                      <td>
                        {user.id !== currentUser.id && (
                          <DeleteUserButton userId={user.id} userName={user.name} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Info cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="ui-card p-5">
          <h3 className="ui-section-title">{t.settings.rolesExplained}</h3>
          <ul className="mt-3 grid gap-1.5 text-sm text-[var(--ink-2)]">
            <li><span className="font-semibold text-[var(--ink)]">Admin</span> — {t.settings.adminDesc}</li>
            <li><span className="font-semibold text-[var(--ink)]">AJK</span> — {t.settings.ajkDesc}</li>
            <li><span className="font-semibold text-[var(--ink)]">Viewer</span> — {t.settings.viewerDesc}</li>
          </ul>
        </div>
        <div className="ui-card p-5">
          <h3 className="ui-section-title">{t.settings.securityNote}</h3>
          <p className="mt-2 text-sm text-[var(--ink-2)]">{t.settings.securityNoteDesc}</p>
        </div>
      </div>
    </AdminPage>
  );
}
