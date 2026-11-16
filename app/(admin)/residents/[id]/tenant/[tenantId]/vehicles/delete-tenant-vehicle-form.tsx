"use client";

import { Trash2 } from "lucide-react";

import { PendingIconButton } from "@/app/components/pending-icon-button";
import { deleteTenantVehicleAndRedirect } from "@/lib/actions/tenant-vehicles";

export function DeleteTenantVehicleForm({ vehicleId }: { vehicleId: string }) {
  return (
    <PendingIconButton
      action={deleteTenantVehicleAndRedirect.bind(null, vehicleId)}
      className="grid size-10 place-items-center rounded-full text-[#c2341a] transition hover:bg-[#ffe6e0] disabled:opacity-50"
    >
      <Trash2 size={16} aria-label="Delete" />
    </PendingIconButton>
  );
}
