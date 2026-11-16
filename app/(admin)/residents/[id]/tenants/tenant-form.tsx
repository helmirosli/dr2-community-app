"use client";

import { useState, useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createTenant,
  updateTenant,
  type TenantFormState,
} from "@/lib/actions/tenants";

const initialState: TenantFormState = {
  ok: false,
  message: "",
};

type TenantFormValues = {
  id?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  vehicles?: Array<{ id?: string; make: string; model: string | null; plateNumber: string }>;
};

type TenantFormProps = {
  residentId: string;
  tenant?: TenantFormValues;
};

type VehicleRow = { make: string; model: string; plateNumber: string };

export function TenantForm({ residentId, tenant }: TenantFormProps) {
  const action = tenant?.id ? updateTenant.bind(null, tenant.id) : createTenant.bind(null, residentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [vehicles, setVehicles] = useState<VehicleRow[]>(
    tenant?.vehicles
      ? tenant.vehicles.map((v) => ({ make: v.make, model: v.model ?? "", plateNumber: v.plateNumber }))
      : [],
  );
  const hiddenValue = JSON.stringify(vehicles);

  const addVehicle = () => {
    setVehicles((prev) => [
      ...prev,
      { make: "", model: "", plateNumber: "" },
    ]);
  };

  const removeVehicle = (index: number) => {
    setVehicles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVehicle = (index: number, field: keyof VehicleRow, value: string) => {
    setVehicles((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  return (
    <form action={formAction} className="ui-card overflow-hidden">
      <section className="ui-form-section">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="ui-label">
            Tenant name
            <input className="ui-input" defaultValue={tenant?.name ?? ""} name="name" required />
          </label>

          <label className="ui-label">
            Phone
            <input className="ui-input" defaultValue={tenant?.phone ?? ""} name="phone" />
          </label>
        </div>

        <label className="ui-label">
          Email
          <input className="ui-input" defaultValue={tenant?.email ?? ""} name="email" type="email" />
        </label>

        <input type="hidden" name="vehicles" value={hiddenValue} />
      </section>

      {/* Vehicle section */}
      <section className="ui-form-section">
        <h2 className="ui-section-title">Vehicles</h2>
        {vehicles.length === 0 ? (
          <p className="ui-hint">No vehicles added yet. Add a vehicle below to register one for this tenant.</p>
        ) : (
          <div className="grid gap-3">
            {vehicles.map((v, index) => (
              <div key={index} className="grid items-end gap-3 rounded-2xl bg-[var(--paper)] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="ui-label">
                  Make
                  <input
                    className="ui-input"
                    value={v.make}
                    onChange={(e) => updateVehicle(index, "make", e.target.value)}
                    required
                  />
                </label>
                <label className="ui-label">
                  Model
                  <input
                    className="ui-input"
                    value={v.model}
                    onChange={(e) => updateVehicle(index, "model", e.target.value)}
                  />
                </label>
                <label className="ui-label">
                  Plate Number
                  <input
                    className="ui-input uppercase"
                    value={v.plateNumber}
                    onChange={(e) => updateVehicle(index, "plateNumber", e.target.value.toUpperCase())}
                    required
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeVehicle(index)}
                  aria-label="Remove vehicle"
                  className="grid size-11 place-items-center justify-self-end rounded-full text-[#c2341a] transition hover:bg-[#ffe6e0]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addVehicle} className="ui-button-secondary w-fit">
          <Plus size={16} />
          Add vehicle
        </button>
      </section>

      <section className="ui-form-section">
        {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

        <button className="ui-button-primary w-full sm:w-fit sm:justify-self-end" disabled={pending} type="submit">
          {pending ? "Saving..." : tenant?.id ? "Save tenant" : "Create tenant"}
        </button>
      </section>
    </form>
  );
}
