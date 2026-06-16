"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ResidentFormState = {
  ok: boolean;
  message: string;
};

const optionalText = z.string().trim().optional().or(z.literal(""));

const residentSchema = z.object({
  unitNumber: z.string().trim().min(1, "Unit number is required.").max(30),
  name: z.string().trim().min(1, "Resident name is required.").max(120),
  phone: optionalText,
  email: z.email("Please enter a valid email.").optional().or(z.literal("")),
  streetBlock: optionalText,
  status: z.enum(["ACTIVE", "EXEMPT", "FOR_SALE", "MOVED_OUT"]),
  notes: optionalText,
});

function normalizeResidentInput(formData: FormData) {
  const parsed = residentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Please check the resident details.",
    };
  }

  return {
    ok: true as const,
    data: {
      unitNumber: parsed.data.unitNumber.toUpperCase(),
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      streetBlock: parsed.data.streetBlock || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    },
  };
}

export async function createResident(_previousState: ResidentFormState, formData: FormData): Promise<ResidentFormState> {
  const user = await assertDashboardUser();
  const normalized = normalizeResidentInput(formData);

  if (!normalized.ok) {
    return normalized;
  }

  let residentId = "";

  try {
    const resident = await prisma.resident.create({
      data: normalized.data,
    });

    residentId = resident.id;

    await prisma.auditLog.create({
      data: {
        entityType: "Resident",
        entityId: resident.id,
        action: "CREATE",
        afterJson: JSON.stringify(normalized.data),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to create resident. The unit number may already exist.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/residents");
  redirect(`/residents/${residentId}`);
}

export async function updateResident(residentId: string, _previousState: ResidentFormState, formData: FormData): Promise<ResidentFormState> {
  const user = await assertDashboardUser();
  const normalized = normalizeResidentInput(formData);

  if (!normalized.ok) {
    return normalized;
  }

  try {
    const existingResident = await prisma.resident.findUnique({
      where: { id: residentId },
    });

    if (!existingResident) {
      return {
        ok: false,
        message: "Resident not found.",
      };
    }

    await prisma.resident.update({
      where: { id: residentId },
      data: normalized.data,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Resident",
        entityId: residentId,
        action: "UPDATE",
        beforeJson: JSON.stringify(existingResident),
        afterJson: JSON.stringify(normalized.data),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to update resident. The unit number may already exist.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/residents");
  revalidatePath(`/residents/${residentId}`);
  redirect(`/residents/${residentId}`);
}