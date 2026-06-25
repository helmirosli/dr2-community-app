"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { read, utils } from "xlsx";

import { requireDashboardUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ParsedPayment = {
  unitNumber: string;
  residentName: string;
  amountSen: number;
  paymentDate: string;
  method: string;
};

export type FileAnalysisResult = {
  newPayments: Array<ParsedPayment & { id: string }>;
  matchingPayments: Array<ParsedPayment>;
  invalidRows: Array<{ rowNumber: number; error: string; data?: unknown }>;
};

async function parseCSVFile(content: string): Promise<ParsedPayment[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const payments: ParsedPayment[] = [];

        for (const row of results.data as Record<string, unknown>[]) {
          try {
            const unit = String(row["Unit Number"] || row["unit"] || row["Unit"] || "").trim();
            const name = String(row["Resident Name"] || row["name"] || row["Name"] || "").trim();
            const amount = String(row["Amount (RM)"] || row["amount"] || row["Amount"] || "").trim();
            const date = String(row["Payment Date"] || row["date"] || row["Date"] || "").trim();
            const method = String(row["Method"] || row["method"] || "").trim();

            if (!unit || !name || !amount || !date) continue;

            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) continue;

            payments.push({
              unitNumber: unit,
              residentName: name,
              amountSen: Math.round(amountNum * 100),
              paymentDate: date,
              method,
            });
          } catch {
            continue;
          }
        }

        resolve(payments);
      },
      error: (error: unknown) => reject(new Error(`CSV parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)),
    });
  });
}

async function parseExcelFile(buffer: Buffer): Promise<ParsedPayment[]> {
  try {
    const workbook = read(buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) throw new Error("No sheet found");

    const data = utils.sheet_to_json(worksheet);
    const payments: ParsedPayment[] = [];

    for (const row of data as Record<string, unknown>[]) {
      try {
        const unit = String(row["Unit Number"] || row["unit"] || row["Unit"] || "").trim();
        const name = String(row["Resident Name"] || row["name"] || row["Name"] || "").trim();
        const amount = String(row["Amount (RM)"] || row["amount"] || row["Amount"] || "").trim();
        const date = String(row["Payment Date"] || row["date"] || row["Date"] || "").trim();
        const method = String(row["Method"] || row["method"] || "").trim();

        if (!unit || !name || !amount || !date) continue;

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) continue;

        payments.push({
          unitNumber: unit,
          residentName: name,
          amountSen: Math.round(amountNum * 100),
          paymentDate: date,
          method,
        });
      } catch {
        continue;
      }
    }

    return payments;
  } catch (error) {
    throw new Error(`Excel parse error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function findDuplicatePayment(payment: ParsedPayment): Promise<boolean> {
  const validMethods = ["CASH", "BANK_TRANSFER", "DUITNOW_QR", "EWALLET", "CHEQUE", "OTHER"] as const;
  const normalizedMethod = payment.method.toUpperCase();
  const method = (validMethods as readonly string[]).includes(normalizedMethod)
    ? (normalizedMethod as (typeof validMethods)[number])
    : "OTHER";

  const existing = await prisma.payment.findFirst({
    where: {
      resident: {
        unitNumber: payment.unitNumber,
      },
      amountSen: payment.amountSen,
      paymentDate: new Date(payment.paymentDate),
      method,
    },
  });

  return !!existing;
}

export async function analyzePaymentFile(
  _previousState: unknown,
  formData: FormData
): Promise<{ ok: boolean; message: string; analysis?: FileAnalysisResult }> {
  try {
    await requireDashboardUser();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { ok: false, message: "No file provided" };
    }

    const isCSV = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCSV && !isExcel) {
      return { ok: false, message: "File must be CSV or Excel format" };
    }

    const buffer = await file.arrayBuffer();
    let payments: ParsedPayment[];

    if (isCSV) {
      const text = new TextDecoder().decode(buffer);
      payments = await parseCSVFile(text);
    } else {
      payments = await parseExcelFile(Buffer.from(buffer));
    }

    if (payments.length === 0) {
      return { ok: false, message: "No valid payment rows found in file" };
    }

    // Analyze each payment
    const newPayments: Array<ParsedPayment & { id: string }> = [];
    const matchingPayments: ParsedPayment[] = [];
    const invalidRows: Array<{ rowNumber: number; error: string; data?: unknown }> = [];

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      try {
        // Validate payment data
        if (!payment.unitNumber || !payment.residentName) {
          invalidRows.push({
            rowNumber: i + 2,
            error: "Missing unit number or resident name",
            data: payment,
          });
          continue;
        }

        // Check if duplicate exists
        const isDuplicate = await findDuplicatePayment(payment);
        if (isDuplicate) {
          matchingPayments.push(payment);
        } else {
          newPayments.push({
            ...payment,
            id: `${payment.unitNumber}-${payment.paymentDate}-${payment.amountSen}`,
          });
        }
      } catch (error) {
        invalidRows.push({
          rowNumber: i + 2,
          error: error instanceof Error ? error.message : "Unknown error",
          data: payment,
        });
      }
    }

    return {
      ok: true,
      message: `Found ${newPayments.length} new payments, ${matchingPayments.length} duplicates`,
      analysis: {
        newPayments,
        matchingPayments,
        invalidRows,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to analyze file",
    };
  }
}

export async function confirmPaymentImport(
  paymentIds: string[]
): Promise<{ ok: boolean; message: string; imported?: number }> {
  try {
    await requireDashboardUser();

    if (paymentIds.length === 0) {
      return { ok: false, message: "No payments selected" };
    }

    // Parse payment IDs to get data
    let imported = 0;

    for (const paymentId of paymentIds) {
      try {
        const [unitNumber, paymentDate, amountSen] = paymentId.split("-");
        const amount = parseInt(amountSen);

        // Find or create resident
        let resident = await prisma.resident.findUnique({
          where: { unitNumber },
        });

        if (!resident) {
          resident = await prisma.resident.create({
            data: {
              unitNumber,
              name: "",
              status: "ACTIVE",
            },
          });
        }

        // Create payment
        await prisma.payment.create({
          data: {
            residentId: resident.id,
            paymentType: "MONTHLY_FEE",
            amountSen: amount,
            paymentDate: new Date(paymentDate),
            method: "OTHER",
          },
        });

        imported++;
      } catch {
        continue;
      }
    }

    revalidatePath("/reports");
    return { ok: true, message: "Payments imported successfully", imported };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}
