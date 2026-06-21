"use client";

import { useActionState } from "react";

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
};

type TenantFormProps = {
  residentId: string;
  tenant?: TenantFormValues;
};

export function TenantForm({ residentId, tenant }: TenantFormProps) {
  const action = tenant?.id ? updateTenant.bind(null, tenant.id) : createTenant.bind(null, residentId);
  const [state, formAction, pending] = useActionState(action, initialState);

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

      {state.message ? <p className="text-sm font-medium text-red-700">{state.message}</p> : null}

      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving..." : tenant?.id ? "Save tenant" : "Create tenant"}
      </button>
    </form>
  );
}
