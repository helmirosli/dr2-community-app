import { ArrowRight, Shield, Trash2 } from "lucide-react";

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
    <main className="min-h-screen bg-[#f6fafb] px-6 py-8 sm:px-8">
      <div className="mx-auto grid max-w-4xl gap-8 [&>*]:min-w-0">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">{t.settings.administration}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t.settings.title}
          </h1>
          <p className="mt-3 text-base text-slate-600">
            {t.settings.subtitle}
          </p>
        </header>

        <div className="grid gap-8">
          {/* Change password section */}
          <ChangePasswordForm userId={currentUser.id} passwordHash={currentUserPasswordHash} />

          {/* User management section */}
          {currentUser.role === "ADMIN" ? (
            <section className="grid gap-6">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Shield size={24} />
                  {t.settings.userManagement}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {t.settings.userManagementSubtitle}
                </p>
              </div>

              {/* Add user form */}
              <UserForm />

              {/* Users list */}
            <section className="rounded-xl border border-border-subtle bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="font-semibold text-slate-900">{t.settings.existingUsers} ({users.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-6 py-3 font-semibold">{t.settings.name}</th>
                      <th className="px-6 py-3 font-semibold">{t.settings.email}</th>
                      <th className="px-6 py-3 font-semibold">{t.settings.role}</th>
                      <th className="px-6 py-3 font-semibold">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length > 0 ? (
                      users.map((user) => (
                        <tr className="transition-colors duration-150 hover:bg-slate-50/60" key={user.id}>
                          <td className="px-6 py-4 font-semibold text-slate-900">{user.name}</td>
                          <td className="px-6 py-4 text-slate-600">{user.email}</td>
                          <td className="px-6 py-4">
                            {user.id === currentUser.id ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-600/20">
                                {roleLabels[user.role] || user.role}
                              </span>
                            ) : (
                              <UserRoleSelect userId={user.id} currentRole={user.role} />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {user.id !== currentUser.id && (
                                <DeleteUserButton userId={user.id} userName={user.name} />
                              )}
                              {user.id === currentUser.id && (
                                <span className="text-xs text-slate-500 italic">{t.settings.thisIsYou}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-6 py-8 text-center text-slate-500" colSpan={4}>
                          {t.settings.noUsers}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
          ) : null}

          {/* Info cards */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-white p-5 transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{t.settings.rolesExplained}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li><span className="font-semibold text-slate-900">Admin</span> — {t.settings.adminDesc}</li>
                    <li><span className="font-semibold text-slate-900">AJK</span> — {t.settings.ajkDesc}</li>
                    <li><span className="font-semibold text-slate-900">Viewer</span> — {t.settings.viewerDesc}</li>
                  </ul>
                </div>
                <ArrowRight className="shrink-0 text-cyan-600" size={18} />
              </div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{t.settings.securityNote}</h3>
                  <p className="mt-3 text-sm text-slate-600">
                    {t.settings.securityNoteDesc}
                  </p>
                </div>
                <ArrowRight className="shrink-0 text-cyan-600" size={18} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
