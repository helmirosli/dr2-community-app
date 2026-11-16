"use client";

import { useState } from "react";
import { Plus, Edit, Eye, Search, X } from "lucide-react";
import Link from "next/link";
import { AdminPage, PageHeader } from "@/app/components/page-header";
import { DeleteTenantForm } from "./delete-tenant-form";

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
    <AdminPage>
      <PageHeader
        title="Tenants"
        subtitle={`${resident.tenants.length} tenant${resident.tenants.length !== 1 ? "s" : ""} for ${resident.name}`}
        back={{ href: `/residents/${residentId}`, label: `Back to ${resident.unitNumber}` }}
        actions={
          <Link className="ui-button-primary" href={`/residents/${residentId}/tenants/new`}>
            <Plus aria-hidden="true" size={16} />
            Add tenant
          </Link>
        }
      />

      {resident.tenants.length === 0 ? (
        <section className="ui-card">
          <div className="ui-empty">No tenants recorded for this resident.</div>
        </section>
      ) : (
        <section className="ui-card overflow-hidden">
          <form className="ui-toolbar" method="get">
            <label className="ui-search">
              <Search aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-2)]" />
              <input defaultValue={query} name="q" placeholder="Search tenant name..." />
            </label>
          </form>
          <div className="overflow-x-auto">
            <table className="ui-table min-w-160">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Vehicles</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resident.tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="font-medium text-[var(--ink)]">{tenant.name}</td>
                    <td className="whitespace-nowrap text-[var(--ink-2)]">{tenant.phone ?? "-"}</td>
                    <td className="text-[var(--ink-2)]">{tenant.email ?? "-"}</td>
                    <td className="text-[var(--ink-2)]">
                      {tenant.vehicles.length > 0 ? (
                        <ul className="space-y-0.5">
                          {tenant.vehicles.map((v) => (
                            <li key={v.id}>
                              {v.make} {v.model ? ` ${v.model}` : ""} — {v.plateNumber}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewTenant(tenant)}
                          className="grid size-10 place-items-center rounded-full text-[var(--blue)] transition hover:bg-black/5"
                          title="View tenant"
                          aria-label="View tenant"
                        >
                          <Eye size={16} />
                        </button>
                        <Link
                          aria-label="Edit"
                          className="grid size-10 place-items-center rounded-full text-[var(--blue)] transition hover:bg-black/5"
                          href={`/residents/${residentId}/tenants/${tenant.id}/edit`}
                        >
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
        </section>
      )}

      {/* View Tenant Modal */}
      {viewTenant && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setViewTenant(null)}
        >
          <div
            className="ui-card max-h-[90vh] w-full overflow-hidden rounded-b-none sm:max-w-md sm:rounded-b-[1.125rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <h3 className="ui-section-title">Tenant Details</h3>
              <button
                type="button"
                onClick={() => setViewTenant(null)}
                aria-label="Close"
                className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5"
              >
                <X size={20} />
              </button>
            </div>
            <dl className="grid gap-4 p-5 text-sm">
              <div>
                <dt className="text-[var(--ink-2)]">Name</dt>
                <dd className="font-medium text-[var(--ink)]">{viewTenant.name}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-2)]">Phone</dt>
                <dd className="font-medium text-[var(--ink)]">{viewTenant.phone ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-2)]">Email</dt>
                <dd className="font-medium text-[var(--ink)]">{viewTenant.email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-[var(--ink-2)]">Vehicles ({viewTenant.vehicles.length})</dt>
                <dd>
                  {viewTenant.vehicles.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {viewTenant.vehicles.map((v) => (
                        <li key={v.id} className="text-[var(--ink)]">
                          {v.make} {v.model ? ` ${v.model}` : ""} — {v.plateNumber}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[var(--ink-2)]">No vehicles recorded</p>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
