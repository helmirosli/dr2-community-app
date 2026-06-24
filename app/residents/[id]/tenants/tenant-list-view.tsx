"use client";

import { useState } from "react";
import { Plus, Edit, Eye, X } from "lucide-react";
import Link from "next/link";
import { DeleteTenantForm } from "./delete-tenant-form";

type Vehicle = {
  id: string;
  make: string;
  model: string | null;
  plateNumber: string;
};

type Tenant = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicles: { id: string; make: string; model: string | null; plateNumber: string }[];
};

type ResidentData = {
  id: string;
  name: string;
  unitNumber: string;
  tenants: Tenant[];
};

type TenantListViewProps = {
  resident: ResidentData;
  residentId: string;
  query: string;
};

export function TenantListView({ resident, residentId, query }: TenantListViewProps) {
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);

  return (
    <main className="min-h-screen bg-[#f6fafb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-lg border border-cyan-950/10 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}`}>
              Back to {resident.unitNumber}
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tenants</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {resident.tenants.length} tenant{resident.tenants.length !== 1 ? "s" : ""} for {resident.name}
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800" href={`/residents/${residentId}/tenants/new`}>
            <Plus aria-hidden="true" size={17} />
            Add tenant
          </Link>
        </header>

        {resident.tenants.length === 0 ? (
          <p className="mt-8 rounded-lg border border-cyan-950/10 bg-white p-8 text-center text-sm text-slate-500">
            No tenants recorded for this resident.
          </p>
        ) : (
          <div className="mt-6 rounded-lg border border-cyan-950/10 bg-white shadow-sm">
            <form className="border-b border-slate-100 p-5" method="get">
              <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                <input className="w-full bg-transparent outline-none" defaultValue={query} name="q" placeholder="Search tenant name..." />
              </div>
            </form>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Vehicles</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resident.tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-950">{tenant.name}</td>
                    <td className="px-5 py-4 text-slate-600">{tenant.phone ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{tenant.email ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {tenant.vehicles.length > 0 ? (
                        <ul className="space-y-0.5">
                          {tenant.vehicles.map((v) => (
                            <li key={v.id}>
                              {v.make} {v.model ? ` ${v.model}` : ""} — {v.plateNumber}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setViewTenant(tenant)}
                          className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                          title="View tenant"
                        >
                          <Eye size={16} />
                        </button>
                        <Link className="text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={`/residents/${residentId}/tenants/${tenant.id}/edit`}>
                          <Edit size={16} />
                        </Link>
                        <DeleteTenantForm tenantId={tenant.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Tenant Modal */}
        {viewTenant && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
            onClick={() => setViewTenant(null)}
          >
            <div
              className="w-full max-h-[90vh] sm:max-w-md bg-white shadow-lg rounded-lg sm:rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Tenant Details</h3>
                <button
                  type="button"
                  onClick={() => setViewTenant(null)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Name</span>
                  <p className="font-medium text-slate-950">{viewTenant.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Phone</span>
                  <p className="font-medium text-slate-950">{viewTenant.phone ?? "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Email</span>
                  <p className="font-medium text-slate-950">{viewTenant.email ?? "-"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Vehicles ({viewTenant.vehicles.length})</span>
                  {viewTenant.vehicles.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {viewTenant.vehicles.map((v) => (
                        <li key={v.id} className="text-slate-950">
                          {v.make} {v.model ? ` ${v.model}` : ""} — {v.plateNumber}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-500">No vehicles recorded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
