import { ArrowRight, ChevronRight, Shield } from "lucide-react";

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
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-4xl gap-6 [&>*]:min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
          <span>Administration</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{t.settings.title}</span>
        </nav>

        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">{t.settings.administration}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{t.settings.title}</h1>
        </div>

        {/* My account */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">My Account</h2>
          <ChangePasswordForm userId={currentUser.id} passwordHash={currentUserPasswordHash} />
        </div>

        {/* User management — admin only */}
        {currentUser.role === "ADMIN" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-1.5"><Shield size={14} />{t.settings.userManagement}</span>
              </h2>
              <span className="text-xs text-slate-400">{users.length} user{users.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="grid gap-4">
              <UserForm />

              <div className="ui-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">{t.settings.name}</th>
                        <th className="px-5 py-3 font-semibold">{t.settings.email}</th>
                        <th className="px-5 py-3 font-semibold">{t.settings.role}</th>
                        <th className="px-5 py-3 font-semibold">{t.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr className="transition hover:bg-slate-50" key={user.id}>
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            {user.name}
                            {user.id === currentUser.id && (
                              <span className="ml-2 text-xs font-normal text-slate-400 italic">{t.settings.thisIsYou}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-600">{user.email}</td>
                          <td className="px-5 py-3">
                            {user.id === currentUser.id ? (
                              <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
                                {roleLabels[user.role] || user.role}
                              </span>
                            ) : (
                              <UserRoleSelect userId={user.id} currentRole={user.role} />
                            )}
                          </td>
                          <td className="px-5 py-3">
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
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="ui-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">{t.settings.rolesExplained}</h3>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              <li><span className="font-semibold text-slate-900">Admin</span> — {t.settings.adminDesc}</li>
              <li><span className="font-semibold text-slate-900">AJK</span> — {t.settings.ajkDesc}</li>
              <li><span className="font-semibold text-slate-900">Viewer</span> — {t.settings.viewerDesc}</li>
            </ul>
          </div>
          <div className="ui-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">{t.settings.securityNote}</h3>
            <p className="mt-2 text-xs text-slate-600">{t.settings.securityNoteDesc}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
