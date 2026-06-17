"use server";

import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";

import { requireDashboardAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createUser(
  _previousState: unknown,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireDashboardAdmin();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = (formData.get("role") as string) || "AJK";

    if (!name || !email || !password) {
      return { ok: false, message: "Name, email, and password are required" };
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { ok: false, message: "User with this email already exists" };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as "ADMIN" | "AJK" | "VIEWER",
      },
    });

    revalidatePath("/settings");
    return { ok: true, message: "User created successfully" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

export async function deleteUser(userId: string): Promise<{ ok: boolean; message: string }> {
  try {
    await requireDashboardAdmin();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, message: "User not found" };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/settings");
    return { ok: true, message: "User deleted successfully" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireDashboardAdmin();

    const validRoles = ["ADMIN", "AJK", "VIEWER"];
    if (!validRoles.includes(role)) {
      return { ok: false, message: "Invalid role" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as "ADMIN" | "AJK" | "VIEWER" },
    });

    revalidatePath("/settings");
    return { ok: true, message: "User role updated successfully" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update user role",
    };
  }
}
