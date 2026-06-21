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
});

function normalizeTenantInput(formData: FormData) {
  const parsed = tenantSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Please check the tenant details.",
    };
  }

  return {
    ok: true as const,
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
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

  try {
    const tenant = await prisma.tenant.create({
      data: {
        ...normalized.data,
        residentId,
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
  } catch {
    return {
      ok: false,
      message: "Unable to create tenant.",
    };
  }

  revalidatePath(`/residents/${residentId}`);
  revalidatePath(`/residents/${residentId}/tenants`);
  redirect(`/residents/${residentId}/tenants`);
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

  try {
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return {
        ok: false,
        message: "Tenant not found.",
      };
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: normalized.data,
    });

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

    revalidatePath(`/residents/${existingTenant.residentId}`);
    revalidatePath(`/residents/${existingTenant.residentId}/tenants`);
    redirect(`/residents/${existingTenant.residentId}/tenants`);
  } catch {
    return {
      ok: false,
      message: "Unable to update tenant.",
    };
  }
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

  revalidatePath(`/residents/${tenant ? tenant.residentId : ""}`);
  revalidatePath(`/residents/${tenant ? tenant.residentId : ""}/tenants`);
  redirect(
    tenant ? `/residents/${tenant.residentId}/tenants` : `/residents`,
  );
}
