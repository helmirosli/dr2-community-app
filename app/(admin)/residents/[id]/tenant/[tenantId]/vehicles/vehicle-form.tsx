"use client";

import { useActionState } from "react";

import { VehicleFormBody } from "@/app/(admin)/residents/[id]/vehicles/vehicle-form";
import {
  createTenantVehicle,
  updateTenantVehicle,
  type VehicleFormState,
} from "@/lib/actions/tenant-vehicles";

const initialState: VehicleFormState = {
  ok: false,
  message: "",
};

type VehicleFormValues = {
  id?: string;
  make?: string;
  model?: string | null;
  plateNumber?: string;
};

type VehicleFormProps = {
  residentId: string;
  tenantId: string;
  vehicle?: VehicleFormValues;
  owner?: string;
};

export function VehicleForm({ residentId, tenantId, vehicle, owner }: VehicleFormProps) {
  const action = vehicle?.id ? updateTenantVehicle.bind(null, vehicle.id) : createTenantVehicle.bind(null, tenantId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <VehicleFormBody
      formAction={formAction}
      pending={pending}
      message={state.message}
      vehicle={vehicle}
      owner={owner}
      cancelHref={`/residents/${residentId}/tenant/${tenantId}/vehicles`}
    />
  );
}
