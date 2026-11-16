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
    <form action={formAction} className="ui-card overflow-hidden">
      <section className="ui-form-section">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="ui-label">
            Make
            <input className="ui-input" defaultValue={vehicle?.make ?? ""} name="make" required />
          </label>

          <label className="ui-label">
            Plate number
            <input className="ui-input uppercase" defaultValue={vehicle?.plateNumber ?? ""} name="plateNumber" required />
          </label>
        </div>

        <label className="ui-label">
          Model
          <input className="ui-input" defaultValue={vehicle?.model ?? ""} name="model" />
        </label>
      </section>

      <section className="ui-form-section">
        {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

        <button className="ui-button-primary w-full sm:w-fit sm:justify-self-end" disabled={pending} type="submit">
          {pending ? "Saving..." : vehicle?.id ? "Save vehicle" : "Create vehicle"}
        </button>
      </section>
    </form>
  );
}
