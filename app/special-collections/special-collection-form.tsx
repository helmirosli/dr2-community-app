"use client";

import { useActionState, useState } from "react";

import {
  createSpecialCollection,
  updateSpecialCollection,
  type SpecialCollectionFormState,
} from "@/lib/actions/special-collections";

const initialState: SpecialCollectionFormState = {
  ok: false,
  message: "",
};

type ResidentOption = {
  id: string;
  unitNumber: string;
  name: string;
};

type SpecialCollectionFormValues = {
  id?: string;
  title?: string;
  description?: string | null;
  amountPerResident?: number;
  dueDate?: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  status?: "DRAFT" | "ACTIVE" | "CLOSED";
} & Record<string, unknown>;

type SpecialCollectionFormProps = {
  collection?: SpecialCollectionFormValues;
  residents: ResidentOption[];
  assignedResidents?: string[];
};

export function SpecialCollectionForm({
  collection,
  residents,
  assignedResidents = [],
}: SpecialCollectionFormProps) {
  const action = collection?.id
    ? updateSpecialCollection.bind(null, collection.id)
    : createSpecialCollection;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedResidents));
  const [assignToAll, setAssignToAll] = useState(!collection?.id && assignedResidents.length === 0);

  const toggleResident = (residentId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(residentId)) {
      newSelected.delete(residentId);
    } else {
      newSelected.add(residentId);
    }
    setSelected(newSelected);
    setAssignToAll(false);
  };

  return (
    <form action={formAction} className="grid gap-5 rounded-lg border border-cyan-950/10 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Title
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.title ?? ""} name="title" required />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Amount per resident (RM)
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.amountPerResident ? (collection.amountPerResident / 100).toFixed(2) : ""} name="amountPerResident" required step="0.01" type="number" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Description
        <textarea className="min-h-20 rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.description ?? ""} name="description" />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Due date
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.dueDate ? new Date(collection.dueDate).toISOString().split("T")[0] : ""} name="dueDate" type="date" />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Event start date
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.eventStartDate ? new Date(collection.eventStartDate).toISOString().split("T")[0] : ""} name="eventStartDate" type="date" />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Event end date
          <input className="rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.eventEndDate ? new Date(collection.eventEndDate).toISOString().split("T")[0] : ""} name="eventEndDate" type="date" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Status
        <select className="rounded-md border border-slate-300 px-3 py-2" defaultValue={collection?.status ?? "DRAFT"} name="status">
          <option value="DRAFT">Draft — not yet active</option>
          <option value="ACTIVE">Active — collecting payments</option>
          <option value="CLOSED">Closed — collection ended</option>
        </select>
      </label>

      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="text-sm font-semibold text-slate-700">Assign to residents</legend>

        <div className="mt-3 grid gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              checked={assignToAll}
              className="size-4 rounded border-slate-300"
              name="assignToAll"
              onChange={(e) => {
                setAssignToAll(e.target.checked);
                if (e.target.checked) setSelected(new Set());
              }}
              type="checkbox"
            />
            Assign to all active households
          </label>

          {!assignToAll && residents.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
              {residents.map((resident) => (
                <label className="flex items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-0 text-sm" key={resident.id}>
                  <input
                    checked={selected.has(resident.id)}
                    className="size-4 rounded border-slate-300"
                    onChange={() => toggleResident(resident.id)}
                    type="checkbox"
                  />
                  <span>
                    {resident.unitNumber} — {resident.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <input name="selectedResidents" type="hidden" value={JSON.stringify([...selected])} />
      </fieldset>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving..." : collection?.id ? "Save collection" : "Create collection"}
      </button>
    </form>
  );
}
