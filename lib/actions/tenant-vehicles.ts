"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type VehicleFormState = {
  ok: boolean;
  message: string;
};

const vehicleSchema = z.object({
  make: z.string().trim().min(1, "Make is required.").max(60),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  plateNumber: z
    .string()
    .trim()
    .min(1, "Plate number is required.")
    .max(20)
    .toUpperCase(),
});

function normalizeVehicleInput(formData: FormData) {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Please check the vehicle details.",
    };
  }

  return {
    ok: true as const,
    data: {
      make: parsed.data.make,
      model: parsed.data.model || null,
      plateNumber: parsed.data.plateNumber,
    },
  };
}

export async function createTenantVehicle(
  tenantId: string,
  _previousState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const user = await assertDashboardUser();
  const normalized = normalizeVehicleInput(formData);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const vehicle = await prisma.tenantVehicle.create({
      data: {
        ...normalized.data,
        tenantId,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TenantVehicle",
        entityId: vehicle.id,
        action: "CREATE",
        afterJson: JSON.stringify(normalized.data),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to create vehicle.",
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (tenant) {
    revalidatePath(`/residents/${tenant.residentId}`);
    revalidatePath(`/residents/${tenant.residentId}/tenants`);
    redirect(`/residents/${tenant.residentId}/tenants`);
  }

  return { ok: false, message: "Unable to redirect." };
}

export async function updateTenantVehicle(
  vehicleId: string,
  _previousState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const user = await assertDashboardUser();
  const normalized = normalizeVehicleInput(formData);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const existingVehicle = await prisma.tenantVehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!existingVehicle) {
      return {
        ok: false,
        message: "Vehicle not found.",
      };
    }

    const vehicle = await prisma.tenantVehicle.update({
      where: { id: vehicleId },
      data: normalized.data,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TenantVehicle",
        entityId: vehicleId,
        action: "UPDATE",
        beforeJson: JSON.stringify(existingVehicle),
        afterJson: JSON.stringify(normalized.data),
        createdBy: user.id,
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: existingVehicle.tenantId },
    });

    if (tenant) {
      revalidatePath(`/residents/${tenant.residentId}`);
      revalidatePath(`/residents/${tenant.residentId}/tenants`);
      redirect(`/residents/${tenant.residentId}/tenants`);
    }

    return { ok: false, message: "Unable to redirect." };
  } catch {
    return {
      ok: false,
      message: "Unable to update vehicle.",
    };
  }
}

export async function deleteTenantVehicle(
  vehicleId: string,
): Promise<VehicleFormState> {
  const user = await assertDashboardUser();

  const vehicle = await prisma.tenantVehicle.findUnique({
    where: { id: vehicleId },
    include: { tenant: true },
  });

  try {
    if (!vehicle) {
      return {
        ok: false,
        message: "Vehicle not found.",
      };
    }

    await prisma.tenantVehicle.delete({
      where: { id: vehicleId },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "TenantVehicle",
        entityId: vehicleId,
        action: "DELETE",
        beforeJson: JSON.stringify(vehicle),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to delete vehicle.",
    };
  }

  if (vehicle?.tenant) {
    revalidatePath(
      `/residents/${vehicle.tenant.residentId}/tenants`,
    );
    redirect(`/residents/${vehicle.tenant.residentId}/tenants`);
  }

  redirect("/residents");
}
