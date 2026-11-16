"use client";

import { Trash2 } from "lucide-react";

import { PendingIconButton } from "@/app/components/pending-icon-button";
import { deleteTenantAndRedirect } from "@/lib/actions/tenants";

export function DeleteTenantForm({ tenantId }: { tenantId: string }) {
  return (
    <PendingIconButton
      action={deleteTenantAndRedirect.bind(null, tenantId)}
      className="inline-flex items-center justify-center rounded text-red-700 hover:text-red-900 disabled:opacity-50"
    >
      <Trash2 size={16} />
    </PendingIconButton>
  );
}
