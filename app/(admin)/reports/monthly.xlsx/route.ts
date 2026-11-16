import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { buildMonthlyReportWorkbook, reportFilename } from "@/lib/reports/exporters";
import {
  clampReportMonth,
  clampReportYear,
  getMonthlyReport,
} from "@/lib/reports/monthly-data";

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
  const month = clampReportMonth(params.get("month") ?? undefined, now.getMonth() + 1);
  const includeInactive = params.get("includeInactive") === "on";

  const { rows, summary } = await getMonthlyReport({ year, month, includeInactive });
  const workbook = await buildMonthlyReportWorkbook(rows, summary, year, month);

  return new NextResponse(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFilename(year, month, "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  });
}
