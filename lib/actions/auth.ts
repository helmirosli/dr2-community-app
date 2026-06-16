"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { clearAuthSession, setAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  ok: boolean;
  message: string;
};

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

const setupSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(120),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function login(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check your login details.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;

  if (!user || !passwordMatches || (user.role !== "ADMIN" && user.role !== "AJK")) {
    return {
      ok: false,
      message: "Invalid email or password.",
    };
  }

  await setAuthSession(user.id);
  redirect("/dashboard");
}

export async function createFirstAdmin(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const existingUserCount = await prisma.user.count();

  if (existingUserCount > 0) {
    redirect("/login");
  }

  const parsed = setupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check the setup details.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "ADMIN",
    },
  });

  await setAuthSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await clearAuthSession();
  redirect("/login");
}