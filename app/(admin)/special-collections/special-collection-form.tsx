"use client";

import { useActionState, useState } from "react";

import {
  createSpecialCollection,
  updateSpecialCollection,
  type SpecialCollectionFormState,
} from "@/lib/actions/special-collections";
import { SearchableSelect } from "@/app/components/searchable-select";

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
    <form action={formAction} className="grid gap-5">
      <div className="ui-card overflow-hidden">
        <section className="ui-form-section">
          <h2 className="ui-section-title">Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="ui-label">
              Title
              <input className="ui-input" defaultValue={collection?.title ?? ""} name="title" required />
            </label>

            <label className="ui-label">
              Amount per resident (RM)
              <input className="ui-input" defaultValue={collection?.amountPerResident ? (collection.amountPerResident / 100).toFixed(2) : ""} name="amountPerResident" required step="0.01" type="number" />
            </label>
          </div>

          <label className="ui-label">
            Description
            <textarea className="ui-textarea min-h-20" defaultValue={collection?.description ?? ""} name="description" />
          </label>

          <div className="ui-label">
            Status
            <SearchableSelect
              name="status"
              defaultValue={collection?.status ?? "DRAFT"}
              options={[
                { value: "DRAFT", label: "Draft — not yet active" },
                { value: "ACTIVE", label: "Active — collecting payments" },
                { value: "CLOSED", label: "Closed — collection ended" },
              ]}
              required
            />
          </div>
        </section>

        <section className="ui-form-section">
          <h2 className="ui-section-title">Dates</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="ui-label">
              Due date
              <input className="ui-input" defaultValue={collection?.dueDate ? new Date(collection.dueDate).toISOString().split("T")[0] : ""} name="dueDate" type="date" />
            </label>

            <label className="ui-label">
              Event start date
              <input className="ui-input" defaultValue={collection?.eventStartDate ? new Date(collection.eventStartDate).toISOString().split("T")[0] : ""} name="eventStartDate" type="date" />
            </label>

            <label className="ui-label">
              Event end date
              <input className="ui-input" defaultValue={collection?.eventEndDate ? new Date(collection.eventEndDate).toISOString().split("T")[0] : ""} name="eventEndDate" type="date" />
            </label>
          </div>
        </section>

        <section className="ui-form-section">
          <h2 className="ui-section-title">Assign to residents</h2>

          <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <input
              checked={assignToAll}
              className="size-4"
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
            <div className="max-h-64 overflow-y-auto rounded-2xl bg-[var(--paper)] p-2">
              {residents.map((resident) => (
                <label className="flex min-h-10 items-center gap-2 border-b border-black/[0.05] px-2 text-sm text-[var(--ink)] last:border-0" key={resident.id}>
                  <input
                    checked={selected.has(resident.id)}
                    className="size-4"
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

          <input name="selectedResidents" type="hidden" value={JSON.stringify([...selected])} />
        </section>
      </div>

      {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

      <button className="ui-button-primary w-full py-3 text-base" disabled={pending} type="submit">
        {pending ? "Saving..." : collection?.id ? "Save collection" : "Create collection"}
      </button>
    </form>
  );
}
