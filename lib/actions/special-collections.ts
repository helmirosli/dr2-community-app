"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertDashboardUser } from "@/lib/auth";
import { ringgitToSen } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type SpecialCollectionFormState = {
  ok: boolean;
  message: string;
};

const optionalText = z.string().trim().optional().or(z.literal(""));

const specialCollectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: optionalText,
  amountPerResident: z.coerce.number().positive("Amount must be more than zero.").max(100000),
  dueDate: z.string().trim().optional().or(z.literal("")),
  eventStartDate: z.string().trim().optional().or(z.literal("")),
  eventEndDate: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]),
  assignToAll: z.string().optional(),
  selectedResidents: z.string().optional(),
});

function parseAssignedResidents(selectedResidents?: string): string[] {
  if (!selectedResidents) return [];
  try {
    return JSON.parse(selectedResidents);
  } catch {
    return [];
  }
}

function getInput(formData: FormData) {
  const parsed = specialCollectionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Please check the details.",
    };
  }

  return {
    ok: true as const,
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      amountSen: ringgitToSen(parsed.data.amountPerResident),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      eventStartDate: parsed.data.eventStartDate ? new Date(parsed.data.eventStartDate) : null,
      eventEndDate: parsed.data.eventEndDate ? new Date(parsed.data.eventEndDate) : null,
      status: parsed.data.status,
      assignToAll: parsed.data.assignToAll === "on",
      selectedResidents: parseAssignedResidents(parsed.data.selectedResidents),
    },
  };
}

export async function createSpecialCollection(
  _previousState: SpecialCollectionFormState,
  formData: FormData,
): Promise<SpecialCollectionFormState> {
  const user = await assertDashboardUser();
  const input = getInput(formData);

  if (!input.ok) {
    return input;
  }

  let collectionId = "";

  try {
    const collection = await prisma.specialCollection.create({
      data: {
        title: input.data.title,
        description: input.data.description,
        amountPerResident: input.data.amountSen,
        dueDate: input.data.dueDate,
        eventStartDate: input.data.eventStartDate,
        eventEndDate: input.data.eventEndDate,
        status: input.data.status,
      },
    });

    collectionId = collection.id;

    // Assign to residents
    if (input.data.assignToAll) {
      const activeResidents = await prisma.resident.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });

      if (activeResidents.length > 0) {
        await prisma.specialCollectionAssignment.createMany({
          data: activeResidents.map((resident) => ({
            specialCollectionId: collection.id,
            residentId: resident.id,
            amountDue: input.data.amountSen,
            amountPaid: 0,
            status: "PENDING_REVIEW",
          })),
        });
      }
    } else if (input.data.selectedResidents.length > 0) {
      await prisma.specialCollectionAssignment.createMany({
        data: input.data.selectedResidents.map((residentId) => ({
          specialCollectionId: collection.id,
          residentId,
          amountDue: input.data.amountSen,
          amountPaid: 0,
          status: "PENDING_REVIEW",
        })),
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: "SpecialCollection",
        entityId: collection.id,
        action: "CREATE",
        afterJson: JSON.stringify({
          title: input.data.title,
          amountSen: input.data.amountSen,
          status: input.data.status,
        }),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to create special collection.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/special-collections");
  redirect(`/special-collections/${collectionId}`);
}

export async function updateSpecialCollection(
  collectionId: string,
  _previousState: SpecialCollectionFormState,
  formData: FormData,
): Promise<SpecialCollectionFormState> {
  const user = await assertDashboardUser();
  const input = getInput(formData);

  if (!input.ok) {
    return input;
  }

  try {
    const existing = await prisma.specialCollection.findUnique({
      where: { id: collectionId },
    });

    if (!existing) {
      return { ok: false, message: "Special collection not found." };
    }

    await prisma.specialCollection.update({
      where: { id: collectionId },
      data: {
        title: input.data.title,
        description: input.data.description,
        amountPerResident: input.data.amountSen,
        dueDate: input.data.dueDate,
        eventStartDate: input.data.eventStartDate,
        eventEndDate: input.data.eventEndDate,
        status: input.data.status,
      },
    });

    // Update assignments if resident selection changed
    if (input.data.assignToAll || input.data.selectedResidents.length > 0) {
      const currentAssignments = await prisma.specialCollectionAssignment.findMany({
        where: { specialCollectionId: collectionId },
        select: { residentId: true },
      });

      const currentResidents = new Set(currentAssignments.map((a) => a.residentId));
      const newResidents = new Set(input.data.selectedResidents);

      // Remove assignments not in new selection
      const toRemove = [...currentResidents].filter((id) => !newResidents.has(id));
      if (toRemove.length > 0) {
        await prisma.specialCollectionAssignment.deleteMany({
          where: {
            specialCollectionId: collectionId,
            residentId: { in: toRemove },
          },
        });
      }

      // Add new assignments
      const toAdd = [...newResidents].filter((id) => !currentResidents.has(id));
      if (toAdd.length > 0) {
        await prisma.specialCollectionAssignment.createMany({
          data: toAdd.map((residentId) => ({
            specialCollectionId: collectionId,
            residentId,
            amountDue: input.data.amountSen,
            amountPaid: 0,
            status: "PENDING_REVIEW",
          })),
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        entityType: "SpecialCollection",
        entityId: collectionId,
        action: "UPDATE",
        beforeJson: JSON.stringify(existing),
        afterJson: JSON.stringify({
          title: input.data.title,
          amountSen: input.data.amountSen,
          status: input.data.status,
        }),
        createdBy: user.id,
      },
    });
  } catch {
    return {
      ok: false,
      message: "Unable to update special collection.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/special-collections");
  revalidatePath(`/special-collections/${collectionId}`);
  redirect(`/special-collections/${collectionId}`);
}
