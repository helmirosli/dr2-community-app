"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { PlateChip } from "@/app/(admin)/residents/[id]/tenants/tenant-list-view";
import {
  createResidentVehicle,
  updateResidentVehicle,
  type VehicleFormState,
} from "@/lib/actions/resident-vehicles";

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

/** Shared vehicle form layout (resident + tenant): plate, car, live preview, sticky save bar. */
export function VehicleFormBody({
  formAction,
  pending,
  message,
  vehicle,
  owner,
  cancelHref,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  message: string;
  vehicle?: VehicleFormValues;
  owner?: string;
  cancelHref: string;
}) {
  const [plate, setPlate] = useState(vehicle?.plateNumber ?? "");
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
      <div className="grid gap-6">
        <section className="ui-card grid gap-4 p-6">
          <div>
            <h2 className="ui-section-title">Number plate</h2>
            <p className="ui-hint mt-0.5">Type it as it appears on the car, e.g. WXY 1234.</p>
          </div>
          <label className="ui-label">
            <span className="sr-only">Plate number</span>
            {/* Styled like a Malaysian number plate */}
            <input
              className="h-16 w-full min-w-0 rounded-xl bg-[#111] px-4 text-center font-heading text-3xl font-bold uppercase tracking-[0.14em] text-white outline-none ring-1 ring-black placeholder:text-white/30 focus:ring-2 focus:ring-[var(--cyan)]"
              name="plateNumber"
              required
              maxLength={20}
              autoComplete="off"
              placeholder="WXY 1234"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
            />
          </label>
        </section>

        <section className="ui-card grid gap-4 p-6">
          <h2 className="ui-section-title">Car</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="ui-label">
              Make
              <input className="ui-input" name="make" required autoComplete="off" placeholder="Perodua" value={make} onChange={(e) => setMake(e.target.value)} />
            </label>
            <label className="ui-label">
              <span>
                Model <span className="font-normal text-[var(--ink-2)]">(optional)</span>
              </span>
              <input className="ui-input" name="model" autoComplete="off" placeholder="Myvi" value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
          </div>
        </section>

        {message ? <p className="ui-alert-error">{message}</p> : null}

        {/* Sticky save bar (sits above the mobile tab bar) */}
        <div className="sticky bottom-[76px] z-10 flex items-center justify-end gap-2 rounded-[22px] bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4">
          <Link href={cancelHref} className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5">
            Cancel
          </Link>
          <button className="ui-button-primary min-w-40" disabled={pending} type="submit">
            {pending ? "Saving…" : vehicle?.id ? "Save changes" : "Add vehicle"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-24">
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white">
          <div aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,0.35),transparent_70%)]" />
          <p className="text-xs font-medium uppercase tracking-wider text-[#8e9ab8]">Preview</p>
          <div className="mt-4">
            <PlateChip plate={plate.trim() || "WXY 1234"} make={make.trim() || "Make"} model={model.trim() || null} />
          </div>
          {owner && <p className="mt-4 truncate text-sm text-[#c7cedd]">{owner}</p>}
          <p className="mt-4 text-xs text-[#8e9ab8]">This is how the car shows up on the tenant and resident pages.</p>
        </div>
      </aside>
    </form>
  );
}

type VehicleFormProps = {
  residentId: string;
  vehicle?: VehicleFormValues;
  owner?: string;
};

export function VehicleForm({ residentId, vehicle, owner }: VehicleFormProps) {
  const action = vehicle?.id ? updateResidentVehicle.bind(null, vehicle.id) : createResidentVehicle.bind(null, residentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <VehicleFormBody
      formAction={formAction}
      pending={pending}
      message={state.message}
      vehicle={vehicle}
      owner={owner}
      cancelHref={`/residents/${residentId}/vehicles`}
    />
  );
}
