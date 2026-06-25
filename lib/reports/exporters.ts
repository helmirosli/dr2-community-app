import path from "node:path";

import ExcelJS from "exceljs";
import pdfmake from "pdfmake";

import { DEFAULT_MONTHLY_FEE_SEN, formatRM } from "@/lib/money";
import { monthLabel } from "@/lib/months";
import type { MonthlyReportRow, MonthlyReportSummary, SelectedMonthStatus } from "@/lib/reports/monthly";
import type { YearGridData } from "@/lib/reports/year-grid-data";

const selectedStatusLabels: Record<SelectedMonthStatus, string> = {
  PAID: "Paid",
  UPFRONT: "Paid (upfront)",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
};

function residentStatusLabel(status: MonthlyReportRow["status"]) {
  if (status === "FOR_SALE") return "For sale";
  if (status === "MOVED_OUT") return "Moved out";
  if (status === "EXEMPT") return "Exempt";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function paidUntilText(row: MonthlyReportRow) {
  return row.paidUntilYear && row.paidUntilMonth
    ? monthLabel(row.paidUntilYear, row.paidUntilMonth)
    : "Not paid yet";
}

function lastPaymentText(row: MonthlyReportRow) {
  return row.lastPaymentDate ? row.lastPaymentDate.toLocaleDateString("en-MY") : "—";
}

function extraText(row: MonthlyReportRow) {
  if (row.extraDueSen <= 0) return "—";
  return row.extraOutstandingSen > 0 ? `${formatRM(row.extraOutstandingSen)} due` : "Cleared";
}

export function reportFilename(year: number, month: number, extension: "xlsx" | "pdf") {
  return `dr2-monthly-report-${year}-${String(month).padStart(2, "0")}.${extension}`;
}

export function yearlyReportFilename(year: number, extension: "xlsx" | "pdf") {
  return `dr2-year-report-${year}.${extension}`;
}

export async function buildMonthlyReportWorkbook(
  rows: MonthlyReportRow[],
  summary: MonthlyReportSummary,
  year: number,
  month: number,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DR2 Community";
  workbook.created = new Date(year, month - 1, 1);

  const sheet = workbook.addWorksheet(`Report ${monthLabel(year, month)}`);
  const periodLabel = monthLabel(year, month);

  sheet.columns = [
    { header: "Unit", key: "unit", width: 12 },
    { header: "Resident", key: "name", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Paid until", key: "paidUntil", width: 14 },
    { header: `${periodLabel} status`, key: "selected", width: 16 },
    { header: "Outstanding months", key: "outstandingMonths", width: 18 },
    { header: "Outstanding (RM)", key: "outstandingAmount", width: 16 },
    { header: "Extra due (RM)", key: "extraDue", width: 14 },
    { header: "Last payment", key: "lastPayment", width: 14 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  for (const row of rows) {
    sheet.addRow({
      unit: row.unitNumber,
      name: row.name,
      status: residentStatusLabel(row.status),
      paidUntil: paidUntilText(row),
      selected: selectedStatusLabels[row.selectedStatus],
      outstandingMonths: row.outstandingMonths,
      outstandingAmount: row.outstandingAmountSen / 100,
      extraDue: row.extraOutstandingSen / 100,
      lastPayment: lastPaymentText(row),
    });
  }

  sheet.getColumn("outstandingAmount").numFmt = "#,##0.00";
  sheet.getColumn("extraDue").numFmt = "#,##0.00";

  sheet.addRow({});
  const totalRow = sheet.addRow({
    name: "Totals",
    outstandingAmount: summary.outstandingAmountSen / 100,
    extraDue: summary.extraOutstandingSen / 100,
  });
  totalRow.font = { bold: true };

  sheet.addRow({});
  sheet.addRow({ unit: "Residents", name: summary.residentCount });
  sheet.addRow({ unit: "Paid", name: summary.paidCount + summary.upfrontCount });
  sheet.addRow({ unit: "Partial", name: summary.partialCount });
  sheet.addRow({ unit: "Unpaid", name: summary.unpaidCount });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

let pdfFontsConfigured = false;

function configurePdfFonts() {
  if (pdfFontsConfigured) {
    return;
  }

  const robotoDir = path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto");

  pdfmake.setFonts({
    Roboto: {
      normal: path.join(robotoDir, "Roboto-Regular.ttf"),
      bold: path.join(robotoDir, "Roboto-Medium.ttf"),
      italics: path.join(robotoDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(robotoDir, "Roboto-MediumItalic.ttf"),
    },
  });

  // The document is fully server-generated: deny all external URLs, and allow
  // local file access only for the bundled Roboto fonts pdfmake needs.
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy((filePath) => filePath.startsWith(robotoDir));

  pdfFontsConfigured = true;
}

export async function buildMonthlyReportPdf(
  rows: MonthlyReportRow[],
  summary: MonthlyReportSummary,
  year: number,
  month: number,
): Promise<Buffer> {
  configurePdfFonts();

  const periodLabel = monthLabel(year, month);
  const headerCells = ["Unit", "Resident", "Status", "Paid until", `${periodLabel} status`, "Outstanding", "Extra"].map(
    (text) => ({ text, bold: true, fillColor: "#0e7490", color: "#ffffff" }),
  );

  const bodyRows = rows.map((row) => [
    row.unitNumber,
    row.name,
    residentStatusLabel(row.status),
    paidUntilText(row),
    selectedStatusLabels[row.selectedStatus],
    row.outstandingMonths > 0 ? `${formatRM(row.outstandingAmountSen)} (${row.outstandingMonths}m)` : "Up to date",
    extraText(row),
  ]);

  const emptyRow = ["No residents match this report filter.", "", "", "", "", "", ""];

  const docDefinition: Record<string, unknown> = {
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [28, 40, 28, 40],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    info: {
      title: `DR2 monthly report ${periodLabel}`,
      author: "DR2 Community",
    },
    content: [
      { text: "DR2 Community", style: "brand" },
      { text: `Resident fee status — ${periodLabel}`, style: "title" },
      {
        text: `Residents: ${summary.residentCount}    Paid: ${summary.paidCount + summary.upfrontCount}    Partial: ${summary.partialCount}    Unpaid: ${summary.unpaidCount}    Outstanding: ${formatRM(summary.outstandingAmountSen)}`,
        style: "subtitle",
        margin: [0, 4, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [40, "*", 50, 55, 70, 90, 70],
          body: [headerCells, ...(bodyRows.length > 0 ? bodyRows : [emptyRow])],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 === 0 ? "#f1f5f9" : null),
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
        },
      },
      {
        text: "Privacy-safe report: phone numbers, bank references, and uploaded proof are intentionally excluded.",
        style: "footer",
        margin: [0, 14, 0, 0],
      },
    ],
    styles: {
      brand: { fontSize: 10, color: "#0e7490", bold: true },
      title: { fontSize: 16, bold: true, margin: [0, 2, 0, 0] },
      subtitle: { fontSize: 9, color: "#475569" },
      footer: { fontSize: 8, color: "#94a3b8", italics: true },
    },
  };

  return pdfmake.createPdf(docDefinition).getBuffer();
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function buildYearGridWorkbook(data: YearGridData): Promise<Buffer> {
  const { rows: unsortedRows, specialCollections, year } = data;

  const rows = [...unsortedRows].sort((a, b) => {
    const unitA = parseInt(a.unitNumber, 10);
    const unitB = parseInt(b.unitNumber, 10);
    return unitA - unitB;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DR2 Community";

  const sheet = workbook.addWorksheet(`${year}`);

  const monthHeaders = MONTH_ABBR.map((m) => ({ header: `${m}-${String(year).slice(2)}`, key: m, width: 10 }));
  const extraHeaders = specialCollections.length > 0
    ? specialCollections.map((sc) => ({ header: sc.title.toUpperCase(), key: `extra_${sc.id}`, width: 12 }))
    : [];

  sheet.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "NO RUMAH", key: "unit", width: 12 },
    { header: "NAMA", key: "name", width: 28 },
    ...monthHeaders,
    ...(extraHeaders.length > 0 ? extraHeaders : [{ header: "EXTRA", key: "extra", width: 10 }]),
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7490" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const statusText = row.status === "FOR_SALE" ? "FOR SALE" : row.status === "MOVED_OUT" ? "MOVED OUT" : row.status === "EXEMPT" ? "EXEMPT" : "";
    const monthValues: Record<string, string | number> = {};
    for (let i = 0; i < 12; i++) {
      const key = MONTH_ABBR[i];
      const amountSen = row.months[i];
      const monthOverride = row.monthStatusOverrides[i];
      monthValues[key] = row.isForSale
        ? statusText
        : amountSen !== null
          ? amountSen / 100
          : monthOverride === "FOR_SALE"
            ? "FOR SALE"
            : monthOverride === "MOVED_OUT"
              ? "MOVED OUT"
          : row.status === "EXEMPT"
            ? "EXEMPT"
            : "";
    }

    const extraValues: Record<string, string> = {};
    if (extraHeaders.length > 0) {
      for (const sc of specialCollections) {
        extraValues[`extra_${sc.id}`] = row.isForSale
          ? statusText
          : row.extraOutstandingSen > 0
            ? `RM${(row.extraOutstandingSen / 100).toFixed(2)}`
            : row.extraDueSen > 0
              ? "PAID"
              : "";
      }
    } else {
      extraValues["extra"] = row.isForSale
        ? statusText
        : row.extraOutstandingSen > 0
          ? `RM${(row.extraOutstandingSen / 100).toFixed(2)}`
          : row.extraDueSen > 0
            ? "PAID"
            : "";
    }

    const dataRow = sheet.addRow({ no: rowIdx + 1, unit: row.unitNumber, name: row.name, ...monthValues, ...extraValues });

    if (row.isForSale) {
      dataRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      dataRow.font = { italic: true, color: { argb: "FF94A3B8" } };
    } else {
      for (let i = 0; i < 12; i++) {
        const amountSen = row.months[i];
        const cell = dataRow.getCell(4 + i);
        if (amountSen !== null && amountSen < DEFAULT_MONTHLY_FEE_SEN && amountSen > 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        } else if (amountSen !== null && amountSen >= DEFAULT_MONTHLY_FEE_SEN) {
          cell.numFmt = "#,##0.00";
        }
      }
    }
  }

  for (let i = 0; i < 12; i++) {
    const col = sheet.getColumn(4 + i);
    col.alignment = { horizontal: "center" };
    col.numFmt = "#,##0.00";
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildYearGridPdf(data: YearGridData): Promise<Buffer> {
  configurePdfFonts();
  const { rows: unsortedRows, specialCollections, year } = data;

  const rows = [...unsortedRows].sort((a, b) => {
    const unitA = parseInt(a.unitNumber, 10);
    const unitB = parseInt(b.unitNumber, 10);
    return unitA - unitB;
  });

  const hasExtra = specialCollections.length > 0 || rows.some((r) => r.extraDueSen > 0);
  const extraColCount = specialCollections.length > 0 ? specialCollections.length : hasExtra ? 1 : 0;

  const monthHeaderCells = MONTH_ABBR.map((m) => ({
    text: `${m}\n${String(year).slice(2)}`,
    bold: true,
    fillColor: "#0e7490",
    color: "#ffffff",
    alignment: "center" as const,
    fontSize: 7,
  }));

  const extraHeaderCells = specialCollections.length > 0
    ? specialCollections.map((sc) => ({ text: sc.title.toUpperCase(), bold: true, fillColor: "#d97706", color: "#ffffff", alignment: "center" as const, fontSize: 7 }))
    : hasExtra
      ? [{ text: "EXTRA", bold: true, fillColor: "#d97706", color: "#ffffff", alignment: "center" as const, fontSize: 7 }]
      : [];

  const headerRow = [
    { text: "No", bold: true, fillColor: "#0e7490", color: "#ffffff", alignment: "center" as const, fontSize: 7 },
    { text: "NO RUMAH", bold: true, fillColor: "#0e7490", color: "#ffffff", fontSize: 7 },
    { text: "NAMA", bold: true, fillColor: "#0e7490", color: "#ffffff", fontSize: 7 },
    ...monthHeaderCells,
    ...extraHeaderCells,
  ];

  const bodyRows = rows.map((row, idx) => {
    const statusText = row.status === "FOR_SALE" ? "FOR SALE" : row.status === "MOVED_OUT" ? "MOVED OUT" : row.status === "EXEMPT" ? "EXEMPT" : "";
    const monthCells = row.isForSale
      ? Array.from({ length: 12 }, () => ({
          text: statusText,
          italics: true,
          color: "#94a3b8",
          alignment: "center" as const,
          fontSize: 7,
        }))
      : row.months.map((amountSen, i) => ({
          text:
            amountSen !== null
              ? `RM${(amountSen / 100).toFixed(2)}`
              : row.monthStatusOverrides[i] === "FOR_SALE"
                ? "FOR SALE"
                : row.monthStatusOverrides[i] === "MOVED_OUT"
                  ? "MOVED OUT"
                  : row.status === "EXEMPT"
                    ? "EXEMPT"
                    : "",
          alignment: "center" as const,
          fontSize: 7,
          fillColor: amountSen !== null && amountSen < DEFAULT_MONTHLY_FEE_SEN && amountSen > 0 ? "#fef3c7" : undefined,
        }));

    const extraCells =
      extraColCount === 0
        ? []
        : row.isForSale
          ? Array.from({ length: extraColCount }, () => ({
              text: statusText,
              italics: true,
              color: "#94a3b8",
              alignment: "center" as const,
              fontSize: 7,
            }))
          : specialCollections.length > 0
            ? specialCollections.map(() => ({
                text: row.extraOutstandingSen > 0 ? `RM${(row.extraOutstandingSen / 100).toFixed(2)}` : row.extraDueSen > 0 ? "PAID" : "",
                alignment: "center" as const,
                color: row.extraOutstandingSen > 0 ? "#d97706" : "#16a34a",
                fontSize: 7,
              }))
            : [{ text: row.extraOutstandingSen > 0 ? `RM${(row.extraOutstandingSen / 100).toFixed(2)}` : row.extraDueSen > 0 ? "PAID" : "", alignment: "center" as const, fontSize: 7 }];

    return [
      { text: idx + 1, alignment: "center", fontSize: 7, fillColor: row.isForSale ? "#e2e8f0" : undefined },
      { text: row.unitNumber, bold: true, fontSize: 7, fillColor: row.isForSale ? "#e2e8f0" : undefined },
      { text: row.name, fontSize: 7, italics: row.isForSale, color: row.isForSale ? "#94a3b8" : undefined, fillColor: row.isForSale ? "#e2e8f0" : undefined },
      ...monthCells,
      ...extraCells,
    ];
  });

  const totalCols = 3 + 12 + extraColCount;
  const noWidth = 12;
  const unitWidth = 28;
  const nameWidth = 46;
  const remaining = 595 - 28 - 28 - noWidth - unitWidth - nameWidth;
  const monthWidth = Math.floor(remaining / (12 + extraColCount));
  const widths = [noWidth, unitWidth, nameWidth, ...Array(12 + extraColCount).fill(monthWidth)];

  const docDefinition: Record<string, unknown> = {
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [28, 40, 28, 40],
    defaultStyle: { font: "Roboto", fontSize: 7 },
    info: { title: `DR2 resident fee ${year}`, author: "DR2 Community" },
    content: [
      { text: "DR2 Community", style: "brand" },
      { text: `Resident fee payment status — ${year}`, style: "title" },
      { text: `Total: ${rows.length} units    |    Blank = not paid yet    |    FOR SALE = vacant unit`, style: "subtitle", margin: [0, 3, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths,
          body: [headerRow, ...(bodyRows.length > 0 ? bodyRows : [Array(totalCols).fill("")])],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 === 0 ? "#f8fafc" : null),
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
      {
        text: "Privacy-safe: phone numbers, bank references, and payment proof are not included in this report.",
        style: "footer",
        margin: [0, 12, 0, 0],
      },
    ],
    styles: {
      brand: { fontSize: 9, color: "#0e7490", bold: true },
      title: { fontSize: 14, bold: true, margin: [0, 2, 0, 0] },
      subtitle: { fontSize: 8, color: "#64748b" },
      footer: { fontSize: 7, color: "#94a3b8", italics: true },
    },
  };

  return pdfmake.createPdf(docDefinition).getBuffer();
}
