"use client";

import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import { deleteResidentVehicleAndRedirect } from "@/lib/actions/resident-vehicles";

export function DeleteVehicleForm({ vehicleId }: { vehicleId: string }) {
  const [state, formAction, pending] = useActionState(
    () => deleteResidentVehicleAndRedirect(vehicleId),
    null,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        className="text-sm font-semibold text-red-700 hover:text-red-900"
        title="Delete vehicle"
        disabled={pending}
      >
        <Trash2 size={16} />
      </button>
      {state?.message && (
        <p className="mt-1 text-xs text-red-700">{state.message}</p>
      )}
    </form>
  );
}
