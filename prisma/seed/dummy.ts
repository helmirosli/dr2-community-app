import { randomUUID } from "node:crypto";
import { hashSync } from "bcryptjs";

import { clearCoreData, prisma } from "./_client";

const DEFAULT_MONTHLY_FEE_SEN = 5000;

type MonthPoint = { year: number; month: number };

type ResidentSeed = {
  unitNumber: string;
  name: string;
  phone: string;
  email: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  notes: string;
};

let hasLegacyCoverageRelationColumns: boolean | null = null;
let hasLegacyAssignmentRelationColumns: boolean | null = null;

async function detectLegacyCoverageRelationColumns() {
  if (hasLegacyCoverageRelationColumns !== null) {
    return hasLegacyCoverageRelationColumns;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `select column_name
     from information_schema.columns
     where table_schema = 'desarestu_db'
       and table_name = 'PaymentCoverage'`,
  );

  const columnSet = new Set(rows.map((row) => row.column_name));
  hasLegacyCoverageRelationColumns =
    columnSet.has("payment") && columnSet.has("resident");

  return hasLegacyCoverageRelationColumns;
}

async function detectLegacyAssignmentRelationColumns() {
  if (hasLegacyAssignmentRelationColumns !== null) {
    return hasLegacyAssignmentRelationColumns;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `select column_name
     from information_schema.columns
     where table_schema = 'desarestu_db'
       and table_name = 'SpecialCollectionAssignment'`,
  );

  const columnSet = new Set(rows.map((row) => row.column_name));
  hasLegacyAssignmentRelationColumns =
    columnSet.has("specialCollection") && columnSet.has("resident");

  return hasLegacyAssignmentRelationColumns;
}

async function insertSpecialCollectionAssignments(
  rows: Array<{
    specialCollectionId: string;
    residentId: string;
    amountDue: number;
    amountPaid: number;
    status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "QUARANTINED";
  }>,
) {
  const now = new Date();
  const legacyColumns = await detectLegacyAssignmentRelationColumns();

  for (const row of rows) {
    if (legacyColumns) {
      await prisma.$executeRawUnsafe(
        `insert into desarestu_db."SpecialCollectionAssignment"
          ("id","specialCollectionId","specialCollection","residentId","resident","amountDue","amountPaid","status","createdAt","updatedAt")
         values
          ($1,$2,$3,$4,$5,$6,$7,$8::desarestu_db."SubmissionStatus",$9,$10)`,
        randomUUID(),
        row.specialCollectionId,
        row.specialCollectionId,
        row.residentId,
        row.residentId,
        row.amountDue,
        row.amountPaid,
        row.status,
        now,
        now,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `insert into desarestu_db."SpecialCollectionAssignment"
          ("id","specialCollectionId","residentId","amountDue","amountPaid","status","createdAt","updatedAt")
         values
          ($1,$2,$3,$4,$5,$6::desarestu_db."SubmissionStatus",$7,$8)`,
        randomUUID(),
        row.specialCollectionId,
        row.residentId,
        row.amountDue,
        row.amountPaid,
        row.status,
        now,
        now,
      );
    }
  }
}

function monthRange(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  const months: MonthPoint[] = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      year += 1;
      month = 1;
    }
  }
  return months;
}

function firstBusinessDay(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 3, 10, 0, 0));
}

async function createCoveragePayment(input: {
  residentId: string;
  createdById: string;
  method?: "CASH" | "BANK_TRANSFER" | "DUITNOW_QR" | "EWALLET" | "CHEQUE" | "OTHER";
  paymentDate: Date;
  note?: string;
  coverages: Array<{ year: number; month: number; amountApplied: number }>;
}) {
  const amountSen = input.coverages.reduce((sum, coverage) => sum + coverage.amountApplied, 0);
  if (amountSen <= 0) return;
  const paymentId = randomUUID();
  const now = new Date();

  await prisma.$executeRawUnsafe(
    `insert into desarestu_db."Payment"
      ("id","residentId","paymentType","amountSen","paymentDate","method","referenceNo","notes","createdById","createdAt","updatedAt")
     values
      ($1,$2,$3::desarestu_db."PaymentType",$4,$5,$6::desarestu_db."PaymentMethod",$7,$8,$9,$10,$11)`,
    paymentId,
    input.residentId,
    "MONTHLY_FEE",
    amountSen,
    input.paymentDate,
    input.method ?? "BANK_TRANSFER",
    `DMY-${input.residentId.slice(-6)}-${input.paymentDate.getTime()}`,
    input.note ?? null,
    input.createdById,
    now,
    now,
  );

  const legacyColumns = await detectLegacyCoverageRelationColumns();

  for (const coverage of input.coverages) {
    const status = coverage.amountApplied >= DEFAULT_MONTHLY_FEE_SEN ? "PAID" : "PARTIAL";
    const coverageId = randomUUID();

    if (legacyColumns) {
      await prisma.$executeRawUnsafe(
        `insert into desarestu_db."PaymentCoverage"
          ("id","paymentId","payment","residentId","resident","year","month","amountApplied","status","createdAt")
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9::desarestu_db."CoverageStatus",$10)`,
        coverageId,
        paymentId,
        paymentId,
        input.residentId,
        input.residentId,
        coverage.year,
        coverage.month,
        coverage.amountApplied,
        status,
        now,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `insert into desarestu_db."PaymentCoverage"
          ("id","paymentId","residentId","year","month","amountApplied","status","createdAt")
         values
          ($1,$2,$3,$4,$5,$6,$7::desarestu_db."CoverageStatus",$8)`,
        coverageId,
        paymentId,
        input.residentId,
        coverage.year,
        coverage.month,
        coverage.amountApplied,
        status,
        now,
      );
    }
  }
}

async function seedResidentMonthlyPattern(input: {
  residentId: string;
  createdById: string;
  months: MonthPoint[];
  skip?: Set<number>;
  partial?: Map<number, number>;
  method?: "CASH" | "BANK_TRANSFER" | "DUITNOW_QR" | "EWALLET" | "CHEQUE" | "OTHER";
  note?: string;
}) {
  for (const point of input.months) {
    const key = point.year * 100 + point.month;
    if (input.skip?.has(key)) continue;
    const applied = input.partial?.get(key) ?? DEFAULT_MONTHLY_FEE_SEN;
    await createCoveragePayment({
      residentId: input.residentId,
      createdById: input.createdById,
      method: input.method,
      paymentDate: firstBusinessDay(point.year, point.month),
      note: input.note,
      coverages: [{ year: point.year, month: point.month, amountApplied: applied }],
    });
  }
}

async function main() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const months = monthRange(2024, 1, currentYear, currentMonth);
  const currentYearMonths = monthRange(currentYear, 1, currentYear, currentMonth);

  await clearCoreData();

  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@dummy.local",
      passwordHash: hashSync("Admin123!"),
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      name: "AJK Reviewer",
      email: "ajk@dummy.local",
      passwordHash: hashSync("Ajk12345!"),
      role: "AJK",
    },
  });

  await prisma.user.create({
    data: {
      name: "View Only",
      email: "viewer@dummy.local",
      passwordHash: hashSync("Viewer123!"),
      role: "VIEWER",
    },
  });

  await prisma.feePlan.create({
    data: {
      name: "Monthly Fee 2024",
      amountSen: DEFAULT_MONTHLY_FEE_SEN,
      frequency: "MONTHLY",
      effectiveFrom: new Date(Date.UTC(2024, 0, 1)),
      isActive: true,
    },
  });

  const residentsSeed: ResidentSeed[] = Array.from({ length: 30 }, (_, index) => {
    const unit = String(index + 1);
    return {
      unitNumber: unit,
      name: `Resident ${unit.padStart(2, "0")}`,
      phone: `60112222${String(index + 1).padStart(2, "0")}`,
      email: `resident${unit}@dummy.local`,
      status: "ACTIVE",
      notes: "Dummy resident profile",
    };
  });

  residentsSeed[4]!.status = "EXEMPT";
  residentsSeed[5]!.status = "EXEMPT";
  residentsSeed[6]!.status = "FOR_SALE";
  residentsSeed[7]!.status = "MOVED_OUT";
  residentsSeed[9]!.status = "EXEMPT";
  residentsSeed[14]!.status = "FOR_SALE";
  residentsSeed[15]!.status = "MOVED_OUT";
  residentsSeed[23]!.status = "EXEMPT";
  residentsSeed[28]!.status = "FOR_SALE";
  residentsSeed[29]!.status = "MOVED_OUT";

  const residents = await Promise.all(
    residentsSeed.map((resident, index) =>
      prisma.resident.create({
        data: {
          unitNumber: resident.unitNumber,
          name: resident.name,
          phone: resident.phone,
          email: resident.email,
          streetBlock: index % 2 === 0 ? "A" : "B",
          addressLine1: `Lot ${resident.unitNumber}, Jalan Komuniti`,
          city: "Shah Alam",
          state: "Selangor",
          zipCode: "40100",
          status: resident.status,
          notes: resident.notes,
          createdAt: new Date(Date.UTC(2024, Math.min(index, 11), 2)),
        },
      }),
    ),
  );

  // A-Z style scenarios across 30 units.
  await seedResidentMonthlyPattern({ residentId: residents[0]!.id, createdById: admin.id, months, note: "Always paid on time" });
  await seedResidentMonthlyPattern({ residentId: residents[1]!.id, createdById: admin.id, months, method: "CASH", note: "Cash-only payer" });
  await seedResidentMonthlyPattern({
    residentId: residents[2]!.id,
    createdById: admin.id,
    months,
    partial: new Map([[currentYear * 100 + Math.max(1, currentMonth - 1), 2000]]),
    note: "Recent partial payment",
  });
  await seedResidentMonthlyPattern({
    residentId: residents[3]!.id,
    createdById: admin.id,
    months,
    skip: new Set([202406, 202409, currentYear * 100 + Math.max(1, currentMonth - 2)]),
    note: "Intermittent arrears",
  });
  await seedResidentMonthlyPattern({
    residentId: residents[5]!.id,
    createdById: admin.id,
    months: currentYearMonths.filter((point) => point.month === 1 || point.month === 5),
    note: "Exempt but paid selected months",
  });
  await seedResidentMonthlyPattern({
    residentId: residents[8]!.id,
    createdById: admin.id,
    months: monthRange(currentYear, 5, currentYear, currentMonth),
    note: "Moved in mid-year",
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Resident",
      entityId: residents[8]!.id,
      action: "UPDATE",
      beforeJson: JSON.stringify({ status: "FOR_SALE" }),
      afterJson: JSON.stringify({ status: "ACTIVE" }),
      createdBy: admin.id,
      createdAt: new Date(Date.UTC(currentYear, 4, 2, 9, 0, 0)),
    },
  });

  await seedResidentMonthlyPattern({
    residentId: residents[9]!.id,
    createdById: admin.id,
    months: monthRange(2024, 1, currentYear, Math.max(1, currentMonth - 4)),
    note: "Later converted to exempt",
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Resident",
      entityId: residents[9]!.id,
      action: "UPDATE",
      beforeJson: JSON.stringify({ status: "ACTIVE" }),
      afterJson: JSON.stringify({ status: "EXEMPT" }),
      createdBy: admin.id,
      createdAt: new Date(Date.UTC(currentYear, Math.max(0, currentMonth - 4), 1, 9, 0, 0)),
    },
  });

  // Carry-forward scenario: Apr gets 20 + 40 = 60, report should normalize 50 + carry 10.
  await createCoveragePayment({
    residentId: residents[10]!.id,
    createdById: admin.id,
    paymentDate: firstBusinessDay(currentYear, 4),
    coverages: [{ year: currentYear, month: 4, amountApplied: 2000 }],
    note: "Carry forward part 1",
  });
  await createCoveragePayment({
    residentId: residents[10]!.id,
    createdById: admin.id,
    paymentDate: firstBusinessDay(currentYear, 4),
    coverages: [{ year: currentYear, month: 4, amountApplied: 4000 }],
    note: "Carry forward part 2",
  });

  await createCoveragePayment({
    residentId: residents[11]!.id,
    createdById: admin.id,
    paymentDate: firstBusinessDay(currentYear, 1),
    coverages: monthRange(currentYear, 1, currentYear, Math.min(currentMonth, 6)).map((point) => ({
      year: point.year,
      month: point.month,
      amountApplied: DEFAULT_MONTHLY_FEE_SEN,
    })),
    note: "Upfront 6-month payment",
  });

  await seedResidentMonthlyPattern({
    residentId: residents[12]!.id,
    createdById: admin.id,
    months,
    partial: new Map(
      monthRange(currentYear, 1, currentYear, currentMonth).map((point) => [point.year * 100 + point.month, 3000]),
    ),
    note: "Consistent underpayment",
  });

  await seedResidentMonthlyPattern({ residentId: residents[13]!.id, createdById: admin.id, months, method: "EWALLET" });
  await seedResidentMonthlyPattern({ residentId: residents[16]!.id, createdById: admin.id, months: monthRange(2025, 1, currentYear, currentMonth) });
  await seedResidentMonthlyPattern({ residentId: residents[17]!.id, createdById: admin.id, months: monthRange(2024, 7, currentYear, currentMonth) });
  await seedResidentMonthlyPattern({ residentId: residents[18]!.id, createdById: admin.id, months: monthRange(currentYear, 1, currentYear, currentMonth) });
  await seedResidentMonthlyPattern({ residentId: residents[19]!.id, createdById: admin.id, months: monthRange(2025, 6, currentYear, currentMonth), method: "DUITNOW_QR" });
  await seedResidentMonthlyPattern({ residentId: residents[20]!.id, createdById: admin.id, months, skip: new Set([202405, 202407, 202410]) });
  await seedResidentMonthlyPattern({ residentId: residents[21]!.id, createdById: admin.id, months, method: "CHEQUE" });
  await seedResidentMonthlyPattern({ residentId: residents[22]!.id, createdById: admin.id, months: monthRange(currentYear - 1, 1, currentYear, currentMonth) });
  await seedResidentMonthlyPattern({
    residentId: residents[23]!.id,
    createdById: admin.id,
    months: currentYearMonths.filter((point) => point.month % 2 === 0),
    note: "Exempt but sporadic top-ups",
  });
  await seedResidentMonthlyPattern({ residentId: residents[24]!.id, createdById: admin.id, months: monthRange(2024, 1, currentYear, currentMonth), skip: new Set([202412, 202501]) });
  await seedResidentMonthlyPattern({ residentId: residents[25]!.id, createdById: admin.id, months: monthRange(2025, 1, currentYear, currentMonth), partial: new Map([[currentYear * 100 + 2, 1000]]) });
  await seedResidentMonthlyPattern({ residentId: residents[26]!.id, createdById: admin.id, months: monthRange(currentYear, 3, currentYear, currentMonth) });
  await seedResidentMonthlyPattern({ residentId: residents[27]!.id, createdById: admin.id, months: monthRange(2024, 1, currentYear, Math.max(1, currentMonth - 1)) });

  const activeCollection = await prisma.specialCollection.create({
    data: {
      title: "Roof Maintenance 2026",
      description: "Quarterly roof waterproofing collection",
      amountPerResident: 12000,
      dueDate: new Date(Date.UTC(currentYear, Math.min(currentMonth, 11), 25)),
      status: "ACTIVE",
    },
  });

  const closedCollection = await prisma.specialCollection.create({
    data: {
      title: "Guardhouse Upgrade 2025",
      description: "Completed guardhouse improvement fund",
      amountPerResident: 8000,
      dueDate: new Date(Date.UTC(currentYear - 1, 10, 30)),
      status: "CLOSED",
    },
  });

  await insertSpecialCollectionAssignments(
    residents.slice(0, 20).map((resident, idx) => ({
      specialCollectionId: activeCollection.id,
      residentId: resident.id,
      amountDue: 12000,
      amountPaid: idx % 3 === 0 ? 12000 : idx % 3 === 1 ? 6000 : 0,
      status: idx % 3 === 2 ? "PENDING_REVIEW" : "APPROVED",
    })),
  );

  await insertSpecialCollectionAssignments(
    residents.slice(0, 15).map((resident) => ({
      specialCollectionId: closedCollection.id,
      residentId: resident.id,
      amountDue: 8000,
      amountPaid: 8000,
      status: "APPROVED",
    })),
  );

  await prisma.publicPaymentSubmission.createMany({
    data: [
      {
        unitNumber: residents[2]!.unitNumber,
        residentName: residents[2]!.name,
        phone: residents[2]!.phone ?? "",
        paymentType: "MONTHLY_FEE",
        amountSen: 5000,
        paymentDate: new Date(Date.UTC(currentYear, currentMonth - 1, 8)),
        method: "BANK_TRANSFER",
        coverageStartYear: currentYear,
        coverageStartMonth: Math.max(1, currentMonth - 1),
        coverageEndYear: currentYear,
        coverageEndMonth: Math.max(1, currentMonth - 1),
        status: "PENDING_REVIEW",
      },
      {
        unitNumber: residents[11]!.unitNumber,
        residentName: residents[11]!.name,
        phone: residents[11]!.phone ?? "",
        paymentType: "MONTHLY_FEE",
        amountSen: 10000,
        paymentDate: new Date(Date.UTC(currentYear, Math.max(0, currentMonth - 2), 12)),
        method: "DUITNOW_QR",
        coverageStartYear: currentYear,
        coverageStartMonth: Math.max(1, currentMonth - 2),
        coverageEndYear: currentYear,
        coverageEndMonth: Math.max(1, currentMonth - 1),
        status: "REJECTED",
        reviewReason: "Dummy rejected sample",
      },
      {
        unitNumber: residents[19]!.unitNumber,
        residentName: residents[19]!.name,
        phone: residents[19]!.phone ?? "",
        paymentType: "MONTHLY_FEE",
        amountSen: 5000,
        paymentDate: new Date(Date.UTC(currentYear, Math.max(0, currentMonth - 3), 4)),
        method: "EWALLET",
        coverageStartYear: currentYear,
        coverageStartMonth: Math.max(1, currentMonth - 3),
        coverageEndYear: currentYear,
        coverageEndMonth: Math.max(1, currentMonth - 3),
        status: "QUARANTINED",
        reviewReason: "Dummy quarantined sample",
      },
    ],
  });

  console.log(`Dummy seeding completed: ${residents.length} residents from 2024 to ${currentYear}-${String(currentMonth).padStart(2, "0")}.`);
}

main()
  .catch((error) => {
    console.error("Dummy seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
