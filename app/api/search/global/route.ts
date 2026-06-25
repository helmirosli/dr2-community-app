import { NextRequest, NextResponse } from "next/server";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await requireDashboardUser();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "8", 10), 20);

  if (!q) {
    return NextResponse.json([]);
  }

  const [residents, payments] = await Promise.all([
    prisma.resident.findMany({
      where: {
        OR: [
          { unitNumber: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, unitNumber: true, name: true, status: true },
      orderBy: { unitNumber: "asc" },
      take: Math.min(5, limit),
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { referenceNo: { contains: q, mode: "insensitive" } },
          { resident: { unitNumber: { contains: q, mode: "insensitive" } } },
          { resident: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        paymentDate: true,
        referenceNo: true,
        resident: { select: { unitNumber: true, name: true } },
      },
      orderBy: { paymentDate: "desc" },
      take: Math.min(3, limit),
    }),
  ]);

  const residentItems = residents.map((resident) => ({
    id: `resident-${resident.id}`,
    type: "resident" as const,
    label: `${resident.unitNumber} — ${resident.name}`,
    description: `Resident (${resident.status})`,
    href: `/residents/${resident.id}`,
  }));

  const paymentItems = payments.map((payment) => ({
    id: `payment-${payment.id}`,
    type: "payment" as const,
    label: `${payment.resident.unitNumber} — ${payment.resident.name}`,
    description: `Payment ${payment.paymentDate.toLocaleDateString("en-MY")}${payment.referenceNo ? ` • Ref ${payment.referenceNo}` : ""}`,
    href: `/payments?q=${encodeURIComponent(payment.resident.unitNumber)}`,
  }));

  const reportItem = {
    id: `report-${q.toLowerCase()}`,
    type: "report" as const,
    label: `Search reports for "${q}"`,
    description: "Open yearly report with this filter",
    href: `/reports?q=${encodeURIComponent(q)}`,
  };

  return NextResponse.json([...residentItems, ...paymentItems, reportItem].slice(0, limit));
}
