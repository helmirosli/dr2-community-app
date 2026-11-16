import { Lock, Users } from "lucide-react";

import { AdminPage, PageHeader } from "@/app/components/page-header";
import type { getDictionary } from "@/lib/i18n";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteUserButton } from "./delete-user-button";
import { ROLES } from "./roles";
import { UserForm } from "./user-form";
import { UserRoleSelect } from "./user-role-select";

type Person = { id: string; name: string; email: string; role: string };

type SettingsViewProps = {
  t: Awaited<ReturnType<typeof getDictionary>>;
  currentUser: Person;
  passwordHash: string;
  users: Person[];
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function RoleChip({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role);
  return <span className={`ui-chip ${r?.tone ?? "bg-[#eef0f4] text-[#5d6779]"}`}>{r?.title ?? role}</span>;
}

/** Presentational settings page; data comes from page.tsx. */
export function SettingsView({ t, currentUser, passwordHash, users }: SettingsViewProps) {
  const isAdmin = currentUser.role === "ADMIN";

  return (
    <AdminPage width="narrow">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      {/* Your account */}
      <section className="ui-card grid gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[image:var(--blend)] font-heading text-2xl font-extrabold text-[#06210b]">
            {initials(currentUser.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-2)]">Your account</p>
            <h2 className="truncate font-heading text-xl font-bold text-[var(--ink)]">{currentUser.name}</h2>
            <p className="truncate text-sm text-[var(--ink-2)]">{currentUser.email}</p>
            <div className="mt-1.5">
              <RoleChip role={currentUser.role} />
            </div>
          </div>
          <div aria-hidden="true" className="relative hidden size-28 shrink-0 overflow-hidden rounded-[24px] bg-[var(--night)] sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
            <img src="/art/a2-login.webp" alt="" className="animate-float absolute inset-0 h-full w-full scale-110 object-cover" />
          </div>
        </div>
        <div className="border-t border-black/5 pt-6">
          <ChangePasswordForm userId={currentUser.id} passwordHash={passwordHash} />
        </div>
      </section>

      {/* Team — admin only */}
      {isAdmin && (
        <section className="ui-card grid gap-5 p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ddf5fd] text-[#0b6e8e]">
              <Users size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="ui-section-title">Team</h2>
              <p className="ui-hint">
                {users.length} {users.length === 1 ? "person" : "people"} can sign in to the dashboard
              </p>
            </div>
          </div>

          <ul className="grid gap-2">
            {users.map((user) => {
              const isMe = user.id === currentUser.id;
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[var(--paper)] p-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white font-heading text-sm font-bold text-[var(--ink)] ring-1 ring-black/5">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-[var(--ink)]">
                      <span className="truncate">{user.name}</span>
                      {isMe && <span className="ui-chip shrink-0 bg-[#ddf5fd] text-[#0b6e8e]">{t.settings.thisIsYou}</span>}
                    </p>
                    <p className="truncate text-xs text-[var(--ink-2)]">{user.email}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {isMe ? (
                      <RoleChip role={user.role} />
                    ) : (
                      <>
                        <UserRoleSelect userId={user.id} currentRole={user.role} />
                        <DeleteUserButton userId={user.id} userName={user.name} />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-black/5 pt-5">
            <UserForm />
          </div>
        </section>
      )}

      {/* Info */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="ui-card p-5">
          <h3 className="ui-section-title">{t.settings.rolesExplained}</h3>
          <ul className="mt-3 grid gap-2 text-sm text-[var(--ink-2)]">
            {ROLES.map((r) => (
              <li key={r.value} className="flex items-start gap-2">
                <span className={`ui-chip shrink-0 ${r.tone}`}>{r.title}</span>
                <span>{r.value === "ADMIN" ? t.settings.adminDesc : r.value === "AJK" ? t.settings.ajkDesc : t.settings.viewerDesc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ui-card flex gap-3 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4d6] text-[#8a6300]">
            <Lock size={18} aria-hidden="true" />
          </span>
          <div>
            <h3 className="ui-section-title">{t.settings.securityNote}</h3>
            <p className="mt-1 text-sm text-[var(--ink-2)]">{t.settings.securityNoteDesc}</p>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
