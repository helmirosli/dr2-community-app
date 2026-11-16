"use client";

import { updateUserRole } from "@/lib/actions/user-management";
import { SearchableDropdown } from "@/app/components/searchable-dropdown";

type UserRoleSelectProps = {
  userId: string;
  currentRole: string;
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "AJK", label: "AJK" },
  { value: "VIEWER", label: "Viewer" },
];

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  return (
    <SearchableDropdown
      name={`role-${userId}`}
      options={ROLE_OPTIONS}
      value={currentRole}
      onChange={(value) => updateUserRole(userId, value)}
    />
  );
}
