import { Eye, ShieldCheck, UserCog, type LucideIcon } from "lucide-react";

export type Role = "ADMIN" | "AJK" | "VIEWER";

// Plain module (not "use client") so both the server page and the client forms can read it.
export const ROLES: { value: Role; title: string; hint: string; icon: LucideIcon; tone: string }[] = [
  { value: "AJK", title: "AJK", hint: "Committee member, can review and record", icon: UserCog, tone: "bg-[#e2f7e1] text-[#1c7a33]" },
  { value: "ADMIN", title: "Admin", hint: "Full access, can manage users", icon: ShieldCheck, tone: "bg-[#ddf5fd] text-[#0b6e8e]" },
  { value: "VIEWER", title: "Viewer", hint: "Read-only access to reports", icon: Eye, tone: "bg-[#eef0f4] text-[#5d6779]" },
];
