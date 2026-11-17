"use client";

import { ConfirmDeleteButton } from "@/app/(admin)/residents/[id]/vehicles/delete-form";
import { deleteTenantVehicleAndRedirect } from "@/lib/actions/tenant-vehicles";

export function DeleteTenantVehicleForm({ vehicleId, plate }: { vehicleId: string; plate?: string }) {
  return <ConfirmDeleteButton action={deleteTenantVehicleAndRedirect.bind(null, vehicleId)} label={plate ?? "vehicle"} />;
}
