import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hashSync } from "bcryptjs";

import { clearCoreData, prisma } from "./_client";

type OfficialResident = {
  unitNumber: string;
  name: string;
  phone?: string;
  email?: string;
  streetBlock?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  status: "ACTIVE" | "EXEMPT" | "FOR_SALE" | "MOVED_OUT";
  notes?: string;
  /** Months paid (RM50 each) from the AJK payment sheet. */
  monthlyPayments?: { year: number; month: number; amountSen: number }[];
  /** Raya 2026 collection: what the house is asked for and what it has paid. Absent = not part of it. */
  rayaDueSen?: number;
  rayaPaidSen?: number;
};

const FEE_SEN = 5000;

function loadResidentsFile() {
  const filePath = resolve(process.cwd(), "prisma/seed/official-residents.json");
  const raw = readFileSync(filePath, "utf8");
  const rows = JSON.parse(raw) as OfficialResident[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("official-residents.json must contain at least one resident.");
  }
  return rows;
}

async function main() {
  const residents = loadResidentsFile();

  // The admin login comes from the environment so no password lives in git.
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 10) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (10+ characters) before running the official seed.");
  }

  await clearCoreData();

  await prisma.user.create({
    data: {
      name: process.env.SEED_ADMIN_NAME ?? "Admin",
      email: adminEmail,
      passwordHash: hashSync(adminPassword),
      role: "ADMIN",
    },
  });

  for (const resident of residents) {
    await prisma.resident.upsert({
      where: { unitNumber: resident.unitNumber },
      update: {
        name: resident.name,
        phone: resident.phone ?? null,
        email: resident.email ?? null,
        streetBlock: resident.streetBlock ?? null,
        addressLine1: resident.addressLine1 ?? null,
        addressLine2: resident.addressLine2 ?? null,
        city: resident.city ?? null,
        state: resident.state ?? null,
        zipCode: resident.zipCode ?? null,
        status: resident.status,
        notes: resident.notes ?? null,
      },
      create: {
        unitNumber: resident.unitNumber,
        name: resident.name,
        phone: resident.phone ?? null,
        email: resident.email ?? null,
        streetBlock: resident.streetBlock ?? null,
        addressLine1: resident.addressLine1 ?? null,
        addressLine2: resident.addressLine2 ?? null,
        city: resident.city ?? null,
        state: resident.state ?? null,
        zipCode: resident.zipCode ?? null,
        status: resident.status,
        notes: resident.notes ?? null,
      },
    });
  }

  // The sheet has no payment dates, so each month is dated the 1st of that month and Raya on 31 Mar 2026.
  const ids = new Map((await prisma.resident.findMany({ select: { id: true, unitNumber: true } })).map((r) => [r.unitNumber, r.id]));
  let monthly = 0;
  for (const r of residents) {
    const residentId = ids.get(r.unitNumber)!;
    for (const p of r.monthlyPayments ?? []) {
      await prisma.payment.create({
        data: {
          residentId,
          paymentType: "MONTHLY_FEE",
          amountSen: p.amountSen,
          paymentDate: new Date(Date.UTC(p.year, p.month - 1, 1)),
          method: "OTHER",
          notes: "Imported from the AJK payment sheet",
          coverages: { create: { residentId, year: p.year, month: p.month, amountApplied: p.amountSen, status: p.amountSen >= FEE_SEN ? "PAID" : "PARTIAL" } },
        },
      });
      monthly += 1;
    }
  }

  const rayaHouses = residents.filter((r) => r.rayaDueSen);
  if (rayaHouses.length > 0) {
    const raya = await prisma.specialCollection.create({
      data: { title: "Raya 2026", description: "Raya collection from the AJK payment sheet", amountPerResident: 4000, dueDate: new Date(Date.UTC(2026, 2, 31)), status: "ACTIVE" },
    });
    for (const r of rayaHouses) {
      const residentId = ids.get(r.unitNumber)!;
      const due = r.rayaDueSen!;
      const paid = r.rayaPaidSen ?? 0;
      await prisma.specialCollectionAssignment.create({
        data: { specialCollectionId: raya.id, residentId, amountDue: due, amountPaid: paid, status: paid >= due ? "APPROVED" : "PENDING_REVIEW" },
      });
      if (paid > 0) {
        await prisma.payment.create({
          data: {
            residentId,
            paymentType: "SPECIAL_COLLECTION",
            specialCollectionId: raya.id,
            amountSen: paid,
            paymentDate: new Date(Date.UTC(2026, 2, 31)),
            method: "OTHER",
            notes: "Imported from the AJK payment sheet",
          },
        });
      }
    }
  }

  console.log(`Official seeding completed: ${residents.length} residents, ${monthly} monthly payments, ${rayaHouses.length} houses on the Raya 2026 collection.`);
}

main()
  .catch((error) => {
    console.error("Official seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
