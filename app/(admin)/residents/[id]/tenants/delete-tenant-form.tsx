"use client";

import { Trash2 } from "lucide-react";

import { PendingIconButton } from "@/app/components/pending-icon-button";
import { deleteTenantAndRedirect } from "@/lib/actions/tenants";

export function DeleteTenantForm({ tenantId }: { tenantId: string }) {
  return (
    <PendingIconButton
      action={deleteTenantAndRedirect.bind(null, tenantId)}
      className="grid size-10 place-items-center rounded-full text-[#c2341a] transition hover:bg-[#ffe6e0] disabled:opacity-50"
    >
      <Trash2 size={16} aria-label="Delete" />
    </PendingIconButton>
  );
}
