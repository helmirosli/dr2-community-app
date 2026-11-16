import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { buildYearGridWorkbook, yearlyReportFilename } from "@/lib/reports/exporters";
import { clampReportYear } from "@/lib/reports/monthly-data";
import { getYearGridData } from "@/lib/reports/year-grid-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse("Authentication required.", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const year = clampReportYear(params.get("year") ?? undefined, now.getFullYear());
  const includeInactive = params.get("includeInactive") === "on";

  const data = await getYearGridData({ year, includeInactive });
  const workbook = await buildYearGridWorkbook(data);

  return new NextResponse(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${yearlyReportFilename(year, "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
