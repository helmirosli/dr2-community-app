import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
};

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

  await clearCoreData();

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

  console.log(`Official seeding completed: ${residents.length} resident records loaded.`);
}

main()
  .catch((error) => {
    console.error("Official seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
