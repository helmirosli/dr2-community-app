"use client";

import { Trash2 } from "lucide-react";

import { deleteResidentVehicleAndRedirect } from "@/lib/actions/resident-vehicles";

export function DeleteVehicleForm({ vehicleId }: { vehicleId: string }) {
  return (
    <form action={deleteResidentVehicleAndRedirect.bind(null, vehicleId)}>
      <button
        type="submit"
        className="text-sm font-semibold text-red-700 hover:text-red-900"
        title="Delete vehicle"
      >
        <Trash2 size={16} />
      </button>
    </form>
  );
}
