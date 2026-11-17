import Link from "next/link";
import { Car, ChevronLeft, Edit, Mail, MessageCircle, Phone, Plus, Search, Users } from "lucide-react";

import { AdminPage } from "@/app/components/page-header";
import { DeleteTenantForm } from "./delete-tenant-form";

type Tenant = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicles: { id: string; make: string; model: string | null; plateNumber: string }[];
};

type ResidentData = { id: string; name: string; unitNumber: string; tenants: Tenant[] };

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/** A vehicle as a Malaysian-style number plate plus make/model. */
export function PlateChip({ plate, make, model }: { plate: string; make: string; model: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--paper)] py-1 pl-1 pr-3">
      <span className="rounded-md bg-[#111] px-2 py-0.5 font-heading text-xs font-bold tracking-[0.12em] text-white ring-1 ring-black">{plate}</span>
      <span className="text-xs text-[var(--ink-2)]">
        {make}
        {model ? ` ${model}` : ""}
      </span>
    </span>
  );
}

export function TenantListView({ resident, residentId, query }: { resident: ResidentData; residentId: string; query: string }) {
  const count = resident.tenants.length;

  return (
    <AdminPage>
      <Link href={`/residents/${residentId}`} className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to house {resident.unitNumber}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--blend)] font-heading text-xl font-extrabold text-[#06210b]">
            {resident.unitNumber}
          </span>
          <div>
            <h1 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-[var(--ink)]">Tenants</h1>
            <p className="text-[15px] text-[var(--ink-2)]">
              {resident.name} · {count} {count === 1 ? "tenant" : "tenants"}
            </p>
          </div>
        </div>
        <Link className="ui-button-primary w-fit" href={`/residents/${residentId}/tenants/new`}>
          <Plus aria-hidden="true" size={16} />
          Add tenant
        </Link>
      </header>

      {(count > 3 || query) && (
        <form method="get" className="flex h-11 w-full items-center gap-2 rounded-full bg-white px-4 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[var(--cyan)] sm:w-80">
          <Search aria-hidden="true" size={16} className="shrink-0 text-[var(--ink-2)]" />
          <input defaultValue={query} name="q" placeholder="Search tenant name" aria-label="Search tenant name" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </form>
      )}

      {count === 0 ? (
        <section className="ui-card grid justify-items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-[var(--paper)] text-[var(--ink-2)]">
            <Users size={28} aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-[var(--ink)]">{query ? "No tenant matches" : "No tenants yet"}</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--ink-2)]">Add the people renting this house, with their phone and vehicles, so the AJK and guards know who lives here.</p>
          </div>
          {!query && (
            <Link className="ui-button-primary mt-1" href={`/residents/${residentId}/tenants/new`}>
              <Plus aria-hidden="true" size={16} />
              Add tenant
            </Link>
          )}
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {resident.tenants.map((tenant) => {
            const wa = tenant.phone ? tenant.phone.replace(/\D/g, "").replace(/^0/, "60") : "";
            return (
              <li key={tenant.id} className="ui-card grid content-start gap-4 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--night)] text-sm font-bold text-white">{initials(tenant.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-lg font-bold text-[var(--ink)]">{tenant.name}</p>
                    <p className="truncate text-sm text-[var(--ink-2)]">
                      {tenant.vehicles.length} {tenant.vehicles.length === 1 ? "vehicle" : "vehicles"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Link
                      aria-label={`Edit ${tenant.name}`}
                      title="Edit"
                      className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                      href={`/residents/${residentId}/tenants/${tenant.id}/edit`}
                    >
                      <Edit size={16} />
                    </Link>
                    <DeleteTenantForm tenantId={tenant.id} name={tenant.name} />
                  </div>
                </div>

                {(tenant.phone || tenant.email) && (
                  <div className="grid gap-2">
                    {tenant.phone && (
                      <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--paper)] py-1.5 pl-3 pr-1.5">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium tabular-nums text-[var(--ink)]">
                          <Phone size={14} className="shrink-0 text-[var(--ink-2)]" aria-hidden="true" />
                          {tenant.phone}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          <a href={`tel:${tenant.phone}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-sm hover:bg-[#fafafa]">
                            Call
                          </a>
                          <a
                            href={`https://wa.me/${wa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-full bg-[#e7f9ee] px-3 py-1.5 text-xs font-semibold text-[#128c4a] hover:brightness-95"
                          >
                            <MessageCircle size={12} aria-hidden="true" /> WhatsApp
                          </a>
                        </span>
                      </div>
                    )}
                    {tenant.email && (
                      <a href={`mailto:${tenant.email}`} className="flex min-w-0 items-center gap-2 px-3 text-sm text-[var(--ink-2)] hover:text-[var(--blue)]">
                        <Mail size={14} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{tenant.email}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-black/5 pt-4">
                  {tenant.vehicles.length > 0 ? (
                    tenant.vehicles.map((v) => <PlateChip key={v.id} plate={v.plateNumber} make={v.make} model={v.model} />)
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
                      <Car size={14} aria-hidden="true" /> No vehicles registered
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
