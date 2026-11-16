import Link from "next/link";
import { Car, ChevronLeft, Edit, Plus, User } from "lucide-react";

import { AdminPage } from "@/app/components/page-header";

/** Page header in the tenant-list style: back link, gradient house tile, title, subtitle, optional action. */
export function HouseHeader({
  unitNumber,
  title,
  subtitle,
  back,
  action,
}: {
  unitNumber: string;
  title: string;
  subtitle: string;
  back: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <>
      <Link href={back.href} className="flex w-fit items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline">
        <ChevronLeft size={16} aria-hidden="true" />
        {back.label}
      </Link>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--blend)] font-heading text-xl font-extrabold text-[#06210b]">
            {unitNumber}
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-[var(--ink)]">{title}</h1>
            <p className="truncate text-[15px] text-[var(--ink-2)]">{subtitle}</p>
          </div>
        </div>
        {action}
      </header>
    </>
  );
}

type Vehicle = { id: string; make: string; model: string | null; plateNumber: string };

/** Vehicles as cards with a big number plate. `basePath` is the vehicles route (…/vehicles). */
export function VehicleListView({
  unitNumber,
  owner,
  ownerRole,
  back,
  basePath,
  vehicles,
  renderDelete,
}: {
  unitNumber: string;
  owner: string;
  ownerRole: string;
  back: { href: string; label: string };
  basePath: string;
  vehicles: Vehicle[];
  renderDelete: (vehicle: Vehicle) => React.ReactNode;
}) {
  const count = vehicles.length;
  const addLink = (
    <Link className="ui-button-primary w-fit" href={`${basePath}/new`}>
      <Plus aria-hidden="true" size={16} />
      Add vehicle
    </Link>
  );

  return (
    <AdminPage>
      <HouseHeader
        unitNumber={unitNumber}
        title="Vehicles"
        subtitle={`${owner} · ${count} ${count === 1 ? "vehicle" : "vehicles"}`}
        back={back}
        action={addLink}
      />

      {count === 0 ? (
        <section className="ui-card grid justify-items-center gap-3 px-6 py-14 text-center">
          <span className="animate-float grid size-16 place-items-center rounded-3xl bg-[#ddf5fd] text-[#0b6e8e]">
            <Car size={28} aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-[var(--ink)]">No vehicles yet</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--ink-2)]">
              Register {owner}&apos;s cars and bikes so the guards can recognise who belongs to house {unitNumber}.
            </p>
          </div>
          <div className="mt-1">{addLink}</div>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => (
            <li key={v.id} className="ui-card grid min-w-0 content-start gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="min-w-0 max-w-full truncate rounded-lg bg-[#111] px-4 py-2 font-heading text-2xl font-bold tracking-[0.14em] text-white ring-1 ring-black">
                  {v.plateNumber}
                </span>
                <div className="ml-auto flex shrink-0 items-center">
                  <Link
                    aria-label={`Edit ${v.plateNumber}`}
                    title="Edit"
                    className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-black/5 hover:text-[var(--ink)]"
                    href={`${basePath}/${v.id}/edit`}
                  >
                    <Edit size={16} />
                  </Link>
                  {renderDelete(v)}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-black/5 pt-4">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                  <Car size={16} className="shrink-0 text-[var(--ink-2)]" aria-hidden="true" />
                  <span className="truncate">
                    {v.make}
                    {v.model ? ` ${v.model}` : ""}
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--ink-2)]">
                  <User size={13} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {owner} · {ownerRole}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
