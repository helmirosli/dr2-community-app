"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { PendingIconButton } from "@/app/components/pending-icon-button";
import { deleteResidentVehicleAndRedirect } from "@/lib/actions/resident-vehicles";

/** Delete asks first: the trash icon opens an inline "Delete / Cancel" confirmation. */
export function ConfirmDeleteButton({ action, label }: { action: () => Promise<void>; label: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${label}`}
        title="Delete"
        className="grid size-10 place-items-center rounded-full text-[var(--ink-2)] transition hover:bg-[#ffe6e0] hover:text-[#c2341a]"
      >
        <Trash2 size={16} />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-[#ffe6e0] py-1 pl-3 pr-1" role="group" aria-label="Confirm delete">
      <span className="text-xs font-semibold text-[#c2341a]">Delete?</span>
      <PendingIconButton action={action} className="rounded-full bg-[#c2341a] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
        Delete
      </PendingIconButton>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-2 py-1 text-xs font-semibold text-[var(--ink-2)] hover:bg-white/60">
        Cancel
      </button>
    </span>
  );
}

export function DeleteVehicleForm({ vehicleId, plate }: { vehicleId: string; plate?: string }) {
  return <ConfirmDeleteButton action={deleteResidentVehicleAndRedirect.bind(null, vehicleId)} label={plate ?? "vehicle"} />;
}
