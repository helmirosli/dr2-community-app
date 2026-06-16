"use client";

import { useActionState } from "react";

import {
  createResident,
  updateResident,
  type ResidentFormState,
} from "@/lib/actions/residents";

const initialState: ResidentFormState = {
  ok: false,
  message: "",
};

type ResidentFormValues = {
  id?: string;
  unitNumber?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  streetBlock?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "MOVED_OUT";
  notes?: string | null;
};

type ResidentFormProps = {
  resident?: ResidentFormValues;
};

export function ResidentForm({ resident }: ResidentFormProps) {
  const action = resident?.id ? updateResident.bind(null, resident.id) : createResident;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Unit number
          <input className="rounded-md border border-slate-300 px-3 py-2 uppercase" defaultValue={resident?.unitNumber ?? ""} name="unitNumber" required />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Resident name
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={resident?.name ?? ""} name="name" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Phone
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={resident?.phone ?? ""} name="phone" />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={resident?.email ?? ""} name="email" type="email" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Street / block
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={resident?.streetBlock ?? ""} name="streetBlock" />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Status
          <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue={resident?.status ?? "ACTIVE"} name="status">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="MOVED_OUT">Moved out</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Notes
        <textarea className="min-h-28 rounded-md border border-slate-300 px-3 py-2" defaultValue={resident?.notes ?? ""} name="notes" />
      </label>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving..." : resident?.id ? "Save resident" : "Create resident"}
      </button>
    </form>
  );
}