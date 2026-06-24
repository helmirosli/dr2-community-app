"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TenantFormState = {
  ok: boolean;
  message: string;
};

const optionalText = z.string().trim().optional().or(z.literal(""));

const tenantSchema = z.object({
  name: z.string().trim().min(1, "Tenant name is required.").max(120),
  phone: optionalText,
  email: z.email("Please enter a valid email.").optional().or(z.literal("")),
  vehicles: z.string().optional().or(z.literal("")),
});

function normalizeTenantInput(formData: FormData) {
  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Please check the tenant details.",
    };
  }

  let vehicles: Array<{ make: string; model?: string; plateNumber: string }> = [];
  if (parsed.data.vehicles) {
    try {
      vehicles = JSON.parse(parsed.data.vehicles);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return {
    ok: true as const,
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      vehicles,
    },
  };
}

export async function createTenant(
  residentId: string,
  _previousState: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  const user = await assertDashboardUser();
  const normalized = normalizeTenantInput(formData);

  if (!normalized.ok) {
    return normalized;
  }

  const { name, phone, email, vehicles } = normalized.data;

  try {
    const tenant = await prisma.tenant.create({
      data: {
        residentId,
        name,
        phone,
        email,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Tenant",
        entityId: tenant.id,
        action: "CREATE",
        afterJson: JSON.stringify(normalized.data),
        createdBy: user.id,
      },
    });

    // Create vehicles
    if (vehicles.length) {
      for (const v of vehicles) {
        await prisma.tenantVehicle.create({
          data: {
            tenantId: tenant.id,
            make: v.make,
            model: v.model ?? null,
            plateNumber: v.plateNumber,
          },
        });
      }
    }

    revalidatePath(`/residents/${residentId}/tenants`);
    redirect(`/residents/${residentId}/tenants`);
  } catch {
    return {
      ok: false,
      message: "Unable to create tenant.",
    };
  }
}

export async function updateTenant(
  tenantId: string,
  _previousState: TenantFormState,
  formData: FormData,
): Promise<TenantFormState> {
  const user = await assertDashboardUser();
  const normalized = normalizeTenantInput(formData);

  if (!normalized.ok) {
    return normalized;
  }

  let existingTenant: { residentId: string; id: string } | null = null;
  try {
    existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return {
        ok: false,
        message: "Tenant not found.",
      };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: normalized.data.name,
        phone: normalized.data.phone,
        email: normalized.data.email,
      },
    });

    if (normalized.data.vehicles.length) {
      await prisma.tenantVehicle.deleteMany({
        where: { tenantId },
      });

      for (const v of normalized.data.vehicles) {
        await prisma.tenantVehicle.create({
          data: {
            tenantId,
            make: v.make,
            model: v.model || null,
            plateNumber: v.plateNumber,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        entityType: "Tenant",
        entityId: tenantId,
        action: "UPDATE",
        beforeJson: JSON.stringify(existingTenant),
        afterJson: JSON.stringify(normalized.data),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to update tenant.",
    };
  }

  if (existingTenant) {
    revalidatePath(`/residents/${existingTenant.residentId}/tenants`);
    redirect(`/residents/${existingTenant.residentId}/tenants`);
  }

  redirect("/residents");
}

export async function deleteTenant(tenantId: string): Promise<TenantFormState> {
  const user = await assertDashboardUser();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  try {

    if (!tenant) {
      return {
        ok: false,
        message: "Tenant not found.",
      };
    }

    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Tenant",
        entityId: tenantId,
        action: "DELETE",
        beforeJson: JSON.stringify(tenant),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to delete tenant.",
    };
  }

  revalidatePath(`/residents/${tenant?.residentId}/tenants`);
  redirect(tenant ? `/residents/${tenant.residentId}/tenants` : `/residents`);
}

export async function deleteTenantAndRedirect(tenantId: string): Promise<void> {
  await deleteTenant(tenantId);
  return undefined;
}
