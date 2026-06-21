"use client";

import { useActionState } from "react";

import {
  createTenantVehicle,
  updateTenantVehicle,
  type VehicleFormState,
} from "@/lib/actions/tenant-vehicles";

const initialState: VehicleFormState = {
  ok: false,
  message: "",
};

type VehicleFormValues = {
  id?: string;
  make?: string;
  model?: string | null;
  plateNumber?: string;
};

type VehicleFormProps = {
  tenantId: string;
  vehicle?: VehicleFormValues;
};

export function VehicleForm({ tenantId, vehicle }: VehicleFormProps) {
  const action = vehicle?.id ? updateTenantVehicle.bind(null, vehicle.id) : createTenantVehicle.bind(null, tenantId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-5 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Make
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={vehicle?.make ?? ""} name="make" required />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Plate number
          <input className="rounded-md border border-slate-300 px-3 py-2 uppercase" defaultValue={vehicle?.plateNumber ?? ""} name="plateNumber" required />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Model
        <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={vehicle?.model ?? ""} name="model" />
      </label>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving..." : vehicle?.id ? "Save vehicle" : "Create vehicle"}
      </button>
    </form>
  );
}
