"use client";

import { Trash2 } from "lucide-react";

import { deleteTenantAndRedirect } from "@/lib/actions/tenants";

export function DeleteTenantForm({ tenantId }: { tenantId: string }) {
  return (
    <form action={deleteTenantAndRedirect.bind(null, tenantId)}>
      <button type="submit" className="text-sm font-semibold text-red-700 hover:text-red-900" title="Delete tenant">
        <Trash2 size={16} />
      </button>
    </form>
  );
}
