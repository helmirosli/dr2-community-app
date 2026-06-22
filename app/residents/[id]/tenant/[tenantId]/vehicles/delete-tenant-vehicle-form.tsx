"use client";

import { Trash2 } from "lucide-react";

import { PendingIconButton } from "@/app/components/pending-icon-button";
import { deleteTenantVehicleAndRedirect } from "@/lib/actions/tenant-vehicles";

export function DeleteTenantVehicleForm({ vehicleId }: { vehicleId: string }) {
  return (
    <PendingIconButton
      action={deleteTenantVehicleAndRedirect.bind(null, vehicleId)}
      className="inline-flex items-center justify-center rounded text-red-700 hover:text-red-900 disabled:opacity-50"
    >
      <Trash2 size={16} />
    </PendingIconButton>
  );
}
