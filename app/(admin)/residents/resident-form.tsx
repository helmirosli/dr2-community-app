"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, Home, LogOut, Phone, ShieldCheck, Tag, type LucideIcon } from "lucide-react";

import { createResident, updateResident, type ResidentFormState } from "@/lib/actions/residents";

const initialState: ResidentFormState = { ok: false, message: "" };

type Status = "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";

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
  status?: Status;
  notes?: string | null;
};

const STATUSES: { value: Status; title: string; hint: string; icon: LucideIcon; tone: string; dot: string }[] = [
  { value: "ACTIVE", title: "Active", hint: "Pays RM50 every month", icon: Home, tone: "text-[#1c7a33] bg-[#e2f7e1]", dot: "bg-[var(--leaf)]" },
  { value: "EXEMPT", title: "Exempt", hint: "No monthly fee", icon: ShieldCheck, tone: "text-[#0b6e8e] bg-[#ddf5fd]", dot: "bg-[var(--cyan)]" },
  { value: "FOR_SALE", title: "For sale", hint: "House is vacant", icon: Tag, tone: "text-[#8a6300] bg-[#fff4d6]", dot: "bg-[var(--amber)]" },
  { value: "MOVED_OUT", title: "Moved out", hint: "Waiting for a new resident", icon: LogOut, tone: "text-[#5d6779] bg-[#eef0f4]", dot: "bg-[var(--hold)]" },
];

export function ResidentForm({ resident }: { resident?: ResidentFormValues }) {
  const isEdit = Boolean(resident?.id);
  const action = resident?.id ? updateResident.bind(null, resident.id) : createResident;
  const [state, formAction, pending] = useActionState(action, initialState);

  // Live values for the preview card.
  const [unit, setUnit] = useState(resident?.unitNumber ?? "");
  const [name, setName] = useState(resident?.name ?? "");
  const [phone, setPhone] = useState(resident?.phone ?? "");
  const [status, setStatus] = useState<Status>(resident?.status ?? "ACTIVE");
  const current = STATUSES.find((s) => s.value === status)!;
  const hasMoreDetails = Boolean(
    resident?.streetBlock || resident?.addressLine1 || resident?.addressLine2 || resident?.city || resident?.state || resident?.zipCode || resident?.notes,
  );

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="grid gap-6">
        {/* House */}
        <section className="ui-card grid gap-5 p-6">
          <h2 className="ui-section-title">House</h2>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <label className="ui-label">
              House no.
              <input
                className="ui-input !py-3 text-center font-heading !text-3xl font-bold uppercase tracking-tight"
                name="unitNumber"
                required
                inputMode="numeric"
                autoComplete="off"
                placeholder="12"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </label>
            <label className="ui-label">
              Resident name
              <input
                className="ui-input !py-3 !text-lg"
                name="name"
                required
                autoComplete="off"
                placeholder="e.g. Ahmad bin Ali"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Status */}
        <section className="ui-card grid gap-4 p-6">
          <div>
            <h2 className="ui-section-title">Status</h2>
            <p className="ui-hint mt-0.5">Decides whether the house is billed each month.</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => {
              const selected = status === s.value;
              const Icon = s.icon;
              return (
                <label
                  key={s.value}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition ${
                    selected ? "bg-white ring-2 ring-[var(--blue)] shadow-[0_6px_20px_-10px_rgba(36,99,232,0.5)]" : "bg-[var(--paper)] ring-transparent hover:ring-black/10"
                  }`}
                >
                  <input type="radio" name="status" value={s.value} checked={selected} onChange={() => setStatus(s.value)} className="sr-only" />
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.tone}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--ink)]">{s.title}</span>
                    <span className="block text-xs text-[var(--ink-2)]">{s.hint}</span>
                  </span>
                  {selected && (
                    <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[var(--blue)] text-white">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section className="ui-card grid gap-4 p-6">
          <h2 className="ui-section-title">Contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="ui-label">
              Phone
              <input
                className="ui-input"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="012-345 6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="ui-label">
              <span>
                Email <span className="font-normal text-[var(--ink-2)]">(optional)</span>
              </span>
              <input className="ui-input" defaultValue={resident?.email ?? ""} name="email" type="email" placeholder="name@example.com" />
            </label>
          </div>
        </section>

        {/* Address + notes: rarely needed, all houses share the street */}
        <details className="ui-card group overflow-hidden" open={hasMoreDetails}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="ui-section-title block">More details</span>
              <span className="ui-hint">Address and notes (optional)</span>
            </span>
            <span className="text-sm font-medium text-[var(--blue)] group-open:hidden">Show</span>
            <span className="hidden text-sm font-medium text-[var(--blue)] group-open:inline">Hide</span>
          </summary>
          <div className="grid gap-4 border-t border-black/5 p-6">
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
                Postcode
                <input className="ui-input" defaultValue={resident?.zipCode ?? ""} name="zipCode" inputMode="numeric" />
              </label>
            </div>
            <label className="ui-label">
              Notes
              <textarea className="ui-textarea min-h-24" defaultValue={resident?.notes ?? ""} name="notes" />
            </label>
          </div>
        </details>

        {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

        {/* Sticky save bar (sits above the mobile tab bar) */}
        <div className="sticky bottom-[76px] z-10 flex items-center justify-end gap-2 rounded-[22px] bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4">
          <Link href={isEdit ? `/residents/${resident!.id}` : "/residents"} className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5">
            Cancel
          </Link>
          <button className="ui-button-primary min-w-40" disabled={pending} type="submit">
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add resident"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-24">
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white">
          <div aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full bg-[radial-gradient(circle,rgba(34,199,242,0.35),transparent_70%)]" />
          <p className="text-xs font-medium uppercase tracking-wider text-[#8e9ab8]">Preview</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[image:var(--blend)] font-heading text-2xl font-extrabold text-[#06210b]">
              {unit.trim() || "–"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-bold">{name.trim() || "Resident name"}</p>
              <p className="flex items-center gap-1.5 text-sm text-[#c7cedd]">
                <span className={`size-2 rounded-full ${current.dot}`} aria-hidden="true" />
                {current.title}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#8e9ab8]">Monthly fee</dt>
              <dd className="font-semibold">{status === "ACTIVE" ? "RM 50.00" : "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#8e9ab8]">Phone</dt>
              <dd className="flex items-center gap-1.5 truncate font-semibold">
                {phone.trim() ? (
                  <>
                    <Phone size={13} aria-hidden="true" /> {phone}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[#8e9ab8]">Phone, email and address stay private. Public pages only show its payment status.</p>
        </div>
      </aside>
    </form>
  );
}
