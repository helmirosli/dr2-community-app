"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, CircleDot, Lock, PencilLine, Search, type LucideIcon } from "lucide-react";

import {
  createSpecialCollection,
  updateSpecialCollection,
  type SpecialCollectionFormState,
} from "@/lib/actions/special-collections";

const initialState: SpecialCollectionFormState = {
  ok: false,
  message: "",
};

type Status = "DRAFT" | "ACTIVE" | "CLOSED";

const STATUSES: { value: Status; title: string; hint: string; icon: LucideIcon; tone: string; chip: string }[] = [
  { value: "DRAFT", title: "Draft", hint: "Not shown to residents yet", icon: PencilLine, tone: "text-[#5d6779] bg-[#eef0f4]", chip: "bg-white/15 text-[#c7cedd]" },
  { value: "ACTIVE", title: "Active", hint: "Collecting payments now", icon: CircleDot, tone: "text-[#1c7a33] bg-[#e2f7e1]", chip: "bg-[#e2f7e1] text-[#1c7a33]" },
  { value: "CLOSED", title: "Closed", hint: "Collection has ended", icon: Lock, tone: "text-[#8a6300] bg-[#fff4d6]", chip: "bg-[#fff4d6] text-[#8a6300]" },
];

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
  status?: Status;
} & Record<string, unknown>;

type SpecialCollectionFormProps = {
  collection?: SpecialCollectionFormValues;
  residents: ResidentOption[];
  assignedResidents?: string[];
};

const toDateInput = (d?: string | null) => (d ? new Date(d).toISOString().split("T")[0] : "");

export function SpecialCollectionForm({
  collection,
  residents,
  assignedResidents = [],
}: SpecialCollectionFormProps) {
  const isEdit = Boolean(collection?.id);
  const action = collection?.id
    ? updateSpecialCollection.bind(null, collection.id)
    : createSpecialCollection;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedResidents));
  const [assignToAll, setAssignToAll] = useState(!collection?.id && assignedResidents.length === 0);

  // Live values for the preview card.
  const [title, setTitle] = useState(collection?.title ?? "");
  const [amount, setAmount] = useState(collection?.amountPerResident ? (collection.amountPerResident / 100).toFixed(2) : "");
  const [status, setStatus] = useState<Status>(collection?.status ?? "DRAFT");
  const [dueDate, setDueDate] = useState(toDateInput(collection?.dueDate));
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = q ? residents.filter((r) => `${r.unitNumber} ${r.name}`.toLowerCase().includes(q)) : residents;
  const houseCount = assignToAll ? residents.length : selected.size;
  const current = STATUSES.find((s) => s.value === status)!;

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

  const setVisible = (on: boolean) => {
    const next = new Set(selected);
    for (const r of visible) {
      if (on) next.add(r.id);
      else next.delete(r.id);
    }
    setSelected(next);
  };

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="grid gap-6">
        {/* Details */}
        <section className="ui-card grid gap-4 p-6">
          <h2 className="ui-section-title">Details</h2>
          <label className="ui-label">
            Title
            <input
              className="ui-input !py-3 !text-lg"
              name="title"
              required
              autoComplete="off"
              placeholder="e.g. Raya guard service 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="ui-label sm:max-w-64">
            Amount per house
            <span className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-heading text-2xl font-bold text-[var(--ink-2)]">RM</span>
              <input
                className="ui-input !py-3 !pl-16 font-heading !text-2xl font-bold tabular-nums"
                name="amountPerResident"
                required
                step="0.01"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </span>
          </label>
          <label className="ui-label">
            <span>Description <span className="font-normal text-[var(--ink-2)]">(optional)</span></span>
            <textarea
              className="ui-textarea min-h-20"
              defaultValue={collection?.description ?? ""}
              name="description"
              placeholder="What is it for? Residents see this."
            />
          </label>
        </section>

        {/* Status */}
        <section className="ui-card grid gap-4 p-6">
          <div>
            <h2 className="ui-section-title">Status</h2>
            <p className="ui-hint mt-0.5">Only active collections can receive payments.</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => {
              const isSelected = status === s.value;
              const Icon = s.icon;
              return (
                <label
                  key={s.value}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition ${
                    isSelected ? "bg-white ring-2 ring-[var(--blue)] shadow-[0_6px_20px_-10px_rgba(36,99,232,0.5)]" : "bg-[var(--paper)] ring-transparent hover:ring-black/10"
                  }`}
                >
                  <input type="radio" name="status" value={s.value} checked={isSelected} onChange={() => setStatus(s.value)} className="sr-only" />
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.tone}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--ink)]">{s.title}</span>
                    <span className="block text-xs text-[var(--ink-2)]">{s.hint}</span>
                  </span>
                  {isSelected && (
                    <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[var(--blue)] text-white">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </section>

        {/* Dates */}
        <section className="ui-card grid gap-4 p-6">
          <div>
            <h2 className="ui-section-title">Dates</h2>
            <p className="ui-hint mt-0.5">All optional.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="ui-label">
              Due date
              <input className="ui-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} name="dueDate" type="date" />
            </label>
            <label className="ui-label">
              Event starts
              <input className="ui-input" defaultValue={toDateInput(collection?.eventStartDate)} name="eventStartDate" type="date" />
            </label>
            <label className="ui-label">
              Event ends
              <input className="ui-input" defaultValue={toDateInput(collection?.eventEndDate)} name="eventEndDate" type="date" />
            </label>
          </div>
        </section>

        {/* Assign */}
        <section className="ui-card grid gap-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="ui-section-title">Assign to residents</h2>
              <p className="ui-hint mt-0.5">Who is expected to pay.</p>
            </div>
            <span className="ui-chip bg-[#ddf5fd] text-[#0b6e8e]">
              {houseCount} of {residents.length} selected
            </span>
          </div>

          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-[var(--paper)] px-3.5 text-sm font-medium text-[var(--ink)]">
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
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 flex-1 basis-full sm:basis-48">
                  <span className="sr-only">Search houses</span>
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-2)]" />
                  <input
                    className="ui-input !pl-10"
                    type="search"
                    placeholder="Search house or name"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button type="button" className="min-h-10 rounded-full px-4 text-sm font-semibold text-[var(--blue)] hover:bg-black/5" onClick={() => setVisible(true)}>
                  Select all
                </button>
                <button type="button" className="min-h-10 rounded-full px-4 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5" onClick={() => setVisible(false)}>
                  Clear
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-2xl ring-1 ring-black/5">
                {visible.map((resident) => {
                  const on = selected.has(resident.id);
                  return (
                    <label
                      className={`flex min-h-12 cursor-pointer items-center gap-3 border-b border-black/[0.05] px-3 text-sm last:border-0 ${on ? "bg-[#f3f7ff]" : "bg-white hover:bg-[var(--paper)]"}`}
                      key={resident.id}
                    >
                      <input checked={on} className="size-4 shrink-0" onChange={() => toggleResident(resident.id)} type="checkbox" />
                      <span className="grid h-8 min-w-10 shrink-0 place-items-center rounded-lg bg-[var(--paper)] px-2 font-heading text-sm font-bold text-[var(--ink)]">
                        {resident.unitNumber}
                      </span>
                      <span className="min-w-0 truncate text-[var(--ink)]">{resident.name}</span>
                    </label>
                  );
                })}
                {visible.length === 0 && <p className="ui-hint p-4 text-center">No house matches “{query}”.</p>}
              </div>
            </div>
          )}

          <input name="selectedResidents" type="hidden" value={JSON.stringify([...selected])} />
        </section>

        {state.message ? <p className="ui-alert-error">{state.message}</p> : null}

        {/* Sticky save bar (sits above the mobile tab bar) */}
        <div className="sticky bottom-[76px] z-10 flex items-center justify-end gap-2 rounded-[22px] bg-white/90 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-xl lg:bottom-4">
          <Link
            href={isEdit ? `/special-collections/${collection!.id}` : "/special-collections"}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--ink-2)] hover:bg-black/5"
          >
            Cancel
          </Link>
          <button className="ui-button-primary min-w-40" disabled={pending} type="submit">
            {pending ? "Saving…" : isEdit ? "Save collection" : "Create collection"}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-24">
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--night)] p-6 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
          <img src="/art/a6-raya.webp" alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-[75%_center] opacity-70" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--night)] via-[var(--night)]/50 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8e9ab8]">Residents see</p>
              <span className={`ui-chip ${current.chip}`}>{current.title}</span>
            </div>
            <p className="mt-16 font-heading text-2xl font-bold leading-tight [overflow-wrap:anywhere]">{title.trim() || "Collection title"}</p>
            <p className="mt-3 font-heading text-4xl font-extrabold tracking-tight tabular-nums">
              RM{(Number(amount) || 0).toFixed(2)}
              <span className="ml-1 text-base font-semibold text-[#c7cedd]">/ house</span>
            </p>
            <dl className="mt-5 grid gap-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">Houses</dt>
                <dd className="font-semibold">
                  {houseCount} house{houseCount === 1 ? "" : "s"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">Expected total</dt>
                <dd className="font-semibold tabular-nums">RM{((Number(amount) || 0) * houseCount).toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#8e9ab8]">Due</dt>
                <dd className="font-semibold tabular-nums">{dueDate || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </aside>
    </form>
  );
}
