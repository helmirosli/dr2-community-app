import { NextRequest, NextResponse } from "next/server";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await requireDashboardUser();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const residents = await prisma.resident.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { unitNumber: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { streetBlock: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      unitNumber: true,
      name: true,
    },
    orderBy: [{ unitNumber: "asc" }, { name: "asc" }],
    take: limit,
  });

  return NextResponse.json(
    residents.map((r) => ({
      value: r.id,
      name: r.name,
      unit: r.unitNumber,
    })),
  );
}
