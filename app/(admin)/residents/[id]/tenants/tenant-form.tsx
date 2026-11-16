"use client";

import Link from "next/link";
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
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="vehicles" value={hiddenValue} />

      {/* Tenant */}
      <section className="ui-card grid gap-4 p-6">
        <h2 className="ui-section-title">Tenant</h2>
        <label className="ui-label">
          Full name
          <input className="ui-input !py-3 !text-lg" defaultValue={tenant?.name ?? ""} name="name" required autoComplete="off" placeholder="e.g. Siti binti Ahmad" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="ui-label">
            Phone
            <input className="ui-input" defaultValue={tenant?.phone ?? ""} name="phone" type="tel" inputMode="tel" placeholder="012-345 6789" />
          </label>
          <label className="ui-label">
            <span>
              Email <span className="font-normal text-[var(--ink-2)]">(optional)</span>
            </span>
            <input className="ui-input" defaultValue={tenant?.email ?? ""} name="email" type="email" placeholder="name@example.com" />
          </label>
        </div>
      </section>

      {/* Vehicles */}
      <section className="ui-card grid gap-4 p-6">
        <div>
          <h2 className="ui-section-title">Vehicles</h2>
          <p className="ui-hint mt-0.5">Plates help the guards recognise who belongs to this house.</p>
        </div>

        {vehicles.map((v, index) => (
          <div key={index} className="grid gap-3 rounded-2xl bg-[var(--paper)] p-4 sm:grid-cols-[11rem_1fr_1fr_auto] sm:items-end">
            <label className="ui-label">
              Plate no.
              {/* Styled like a Malaysian number plate */}
              <input
                className="h-11 w-full min-w-0 rounded-lg bg-[#111] px-3 text-center font-heading text-lg font-bold uppercase tracking-[0.14em] text-white outline-none ring-1 ring-black placeholder:text-white/30 focus:ring-2 focus:ring-[var(--cyan)]"
                value={v.plateNumber}
                onChange={(e) => updateVehicle(index, "plateNumber", e.target.value.toUpperCase())}
                placeholder="WXY 1234"
                required
                autoComplete="off"
              />
            </label>
            <label className="ui-label">
              Make
              <input className="ui-input" value={v.make} onChange={(e) => updateVehicle(index, "make", e.target.value)} placeholder="Perodua" required />
            </label>
            <label className="ui-label">
              Model
              <input className="ui-input" value={v.model} onChange={(e) => updateVehicle(index, "model", e.target.value)} placeholder="Myvi" />
            </label>
            <button
              type="button"
              onClick={() => removeVehicle(index)}
              aria-label="Remove vehicle"
              title="Remove vehicle"
              className="grid size-11 place-items-center justify-self-end rounded-full text-[var(--ink-2)] transition hover:bg-[#ffe6e0] hover:text-[#c2341a]"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addVehicle}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d2d2d7] py-3.5 text-sm font-semibold text-[var(--ink-2)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
        >
          <Plus size={16} aria-hidden="true" />
          {vehicles.length ? "Add another vehicle" : "Add vehicle"}
        </button>
      </section>

      {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

      {/* Sticky save bar (above the mobile tab bar) */}
      <div className="sticky bottom-[76px] z-10 flex items-center justify-end gap-2 rounded-[22px] bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4">
        <Link href={`/residents/${residentId}/tenants`} className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5">
          Cancel
        </Link>
        <button className="ui-button-primary min-w-40" disabled={pending} type="submit">
          {pending ? "Saving…" : tenant?.id ? "Save changes" : "Add tenant"}
        </button>
      </div>
    </form>
  );
}
