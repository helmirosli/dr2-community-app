"use client";

import { useActionState } from "react";

import {
  createResident,
  updateResident,
  type ResidentFormState,
} from "@/lib/actions/residents";
import { SearchableSelect } from "@/app/components/searchable-select";

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
    <form action={formAction} className="ui-card overflow-hidden">
      <section className="ui-form-section">
        <h2 className="ui-section-title">Household</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="ui-label">
            Unit number
            <input className="ui-input uppercase" defaultValue={resident?.unitNumber ?? ""} name="unitNumber" required />
          </label>

          <label className="ui-label">
            Resident name
            <input className="ui-input" defaultValue={resident?.name ?? ""} name="name" required />
          </label>

          <label className="ui-label">
            Phone
            <input className="ui-input" defaultValue={resident?.phone ?? ""} name="phone" />
          </label>

          <label className="ui-label">
            Email
            <input className="ui-input" defaultValue={resident?.email ?? ""} name="email" type="email" />
          </label>
        </div>
      </section>

      <section className="ui-form-section">
        <h2 className="ui-section-title">Address</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="ui-label">
            Street / block
            <input className="ui-input" defaultValue={resident?.streetBlock ?? ""} name="streetBlock" />
          </label>

          <label className="ui-label">
            Address line 1
            <input className="ui-input" defaultValue={resident?.addressLine1 ?? ""} name="addressLine1" />
          </label>

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

          <label className="ui-label">
            Zip code
            <input className="ui-input" defaultValue={resident?.zipCode ?? ""} name="zipCode" />
          </label>
        </div>
      </section>

      <section className="ui-form-section">
        <h2 className="ui-section-title">Status &amp; notes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ui-label">
            Status
            <SearchableSelect
              name="status"
              defaultValue={resident?.status ?? "ACTIVE"}
              options={[
                { value: "ACTIVE", label: "Active — paying RM50" },
                { value: "EXEMPT", label: "Exempt — exempt from monthly fee" },
                { value: "FOR_SALE", label: "For sale — vacant" },
                { value: "MOVED_OUT", label: "Moved out — pending new resident" },
              ]}
              required
            />
          </div>
        </div>

        <label className="ui-label">
          Notes
          <textarea className="ui-textarea min-h-28" defaultValue={resident?.notes ?? ""} name="notes" />
        </label>
      </section>

      <section className="ui-form-section">
        {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

        <button className="ui-button-primary w-full sm:w-fit sm:justify-self-end" disabled={pending} type="submit">
          {pending ? "Saving..." : resident?.id ? "Save resident" : "Create resident"}
        </button>
      </section>
    </form>
  );
}