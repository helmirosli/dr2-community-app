"use server";

import { assertDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tourById } from "@/lib/tours/defs";
import { parseSeen } from "@/lib/tours/state";

/** Remembers that the signed-in person finished or skipped a tour, so it stays off. The version comes from the code, never from the caller. */
export async function completeTour(id: string) {
  const user = await assertDashboardUser();
  const tour = tourById(id);
  if (!tour || tour.audience !== "staff") return;

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { tourState: true } });
  const seen = parseSeen(row?.tourState);
  seen[tour.id] = tour.version;
  await prisma.user.update({ where: { id: user.id }, data: { tourState: seen } });
}

/** "Show tips again": forget every tour this person has seen. */
export async function resetTours() {
  const user = await assertDashboardUser();
  await prisma.user.update({ where: { id: user.id }, data: { tourState: {} } });
}
