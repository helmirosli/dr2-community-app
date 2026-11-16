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
    <form action={formAction} className="mt-6 grid gap-5 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Tenant name
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={tenant?.name ?? ""} name="name" required />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Phone
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={tenant?.phone ?? ""} name="phone" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Email
        <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={tenant?.email ?? ""} name="email" type="email" />
      </label>

      <input type="hidden" name="vehicles" value={hiddenValue} />

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      {/* Vehicle section */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Vehicles</h3>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-500">No vehicles added yet. Add a vehicle below to register one for this tenant.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Make</th>
                  <th className="px-3 py-2 text-left font-semibold">Model</th>
                  <th className="px-3 py-2 text-left font-semibold">Plate Number</th>
                  <th className="px-3 py-2 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v, index) => (
                  <tr key={index}>
                    <td className="p-2">
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1"
                        value={v.make}
                        onChange={(e) => updateVehicle(index, "make", e.target.value)}
                        required
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1"
                        value={v.model}
                        onChange={(e) => updateVehicle(index, "model", e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1 uppercase"
                        value={v.plateNumber}
                        onChange={(e) => updateVehicle(index, "plateNumber", e.target.value.toUpperCase())}
                        required
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => removeVehicle(index)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={addVehicle}
          className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-md bg-cyan-50 px-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
        >
          <Plus size={16} />
          Add vehicle
        </button>
      </div>

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving..." : tenant?.id ? "Save tenant" : "Create tenant"}
      </button>
    </form>
  );
}
