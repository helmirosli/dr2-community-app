import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Pending-review count for the admin nav badge (staff only, no caching).
export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const count = await prisma.publicPaymentSubmission.count({ where: { status: "PENDING_REVIEW" } });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
