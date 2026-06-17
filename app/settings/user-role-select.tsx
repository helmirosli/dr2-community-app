"use client";

import { updateUserRole } from "@/lib/actions/user-management";

type UserRoleSelectProps = {
  userId: string;
  currentRole: string;
};

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    await updateUserRole(userId, newRole);
  };

  return (
    <select
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      defaultValue={currentRole}
      onChange={handleChange}
    >
      <option value="ADMIN">Admin</option>
      <option value="AJK">AJK</option>
      <option value="VIEWER">Viewer</option>
    </select>
  );
}
