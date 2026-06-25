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
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  status?: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  notes?: string | null;
};

type ResidentFormProps = {
  resident?: ResidentFormValues;
};

export function ResidentForm({ resident }: ResidentFormProps) {
  const action = resident?.id ? updateResident.bind(null, resident.id) : createResident;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="ui-card grid gap-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="ui-label">
          Unit number
          <input className="ui-input uppercase" defaultValue={resident?.unitNumber ?? ""} name="unitNumber" required />
        </label>

        <label className="ui-label">
          Resident name
          <input className="ui-input" defaultValue={resident?.name ?? ""} name="name" required />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="ui-label">
          Phone
          <input className="ui-input" defaultValue={resident?.phone ?? ""} name="phone" />
        </label>

        <label className="ui-label">
          Email
          <input className="ui-input" defaultValue={resident?.email ?? ""} name="email" type="email" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="ui-label">
          Street / block
          <input className="ui-input" defaultValue={resident?.streetBlock ?? ""} name="streetBlock" />
        </label>

        <label className="ui-label">
          Address line 1
          <input className="ui-input" defaultValue={resident?.addressLine1 ?? ""} name="addressLine1" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="ui-label">
          Address line 2
          <input className="ui-input" defaultValue={resident?.addressLine2 ?? ""} name="addressLine2" />
        </label>

        <label className="ui-label">
          City
          <input className="ui-input" defaultValue={resident?.city ?? ""} name="city" />
        </label>

        <label className="ui-label">
          State
          <input className="ui-input" defaultValue={resident?.state ?? ""} name="state" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="ui-label">
          Zip code
          <input className="ui-input" defaultValue={resident?.zipCode ?? ""} name="zipCode" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="ui-label">
          Status
          <select className="ui-select" defaultValue={resident?.status ?? "ACTIVE"} name="status">
            <option value="ACTIVE">Active — paying RM50</option>
            <option value="EXEMPT">Exempt — exempt from monthly fee</option>
            <option value="FOR_SALE">For sale — vacant</option>
            <option value="MOVED_OUT">Moved out — pending new resident</option>
          </select>
        </label>
      </div>

      <label className="ui-label">
        Notes
        <textarea className="ui-textarea min-h-28" defaultValue={resident?.notes ?? ""} name="notes" />
      </label>

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="ui-button-primary" disabled={pending} type="submit">
        {pending ? "Saving..." : resident?.id ? "Save resident" : "Create resident"}
      </button>
    </form>
  );
}