import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";

function buildFromKKEnv(): string | null {
  const host = process.env.KK_HOST;
  if (!host) return null;
  const port = process.env.KK_PORT ?? "";
  const username = process.env.KK_USERNAME ?? "";
  const password = process.env.KK_PASSWORD ?? "";
  const database = process.env.KK_DATABASE ?? "";
  const ssl = process.env.KK_SSL;
  let auth = "";
  if (username) {
    auth = encodeURIComponent(username);
    if (password) auth += ":" + encodeURIComponent(password);
    auth += "@";
  }

  const portPart = port ? `:${port}` : "";
  let url = `postgresql://${auth}${host}${portPart}/${database}`;
  if (ssl && ssl !== "false" && ssl !== "0") {
    url += "&sslmode=require";
  }
  return url;
}

const databaseUrl = process.env.DATABASE_URL ?? buildFromKKEnv();

if (!databaseUrl) {
  throw new Error("DATABASE_URL or KK_* environment variables must be set.");
}

// dotenv only fills variables the shell didn't set, so a shell without DATABASE_URL silently gets the
// .env.example placeholder ("aws-0-[REGION]…") and Prisma fails with a vague "Invalid URL".
if (databaseUrl.includes("[REGION]") || databaseUrl.includes("[YOUR-PASSWORD]")) {
  throw new Error(
    "DATABASE_URL is still the .env.example placeholder. Export the real DATABASE_URL in this shell (e.g. `source ~/.zshrc`) or put it in .env.",
  );
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

export async function clearCoreData() {
  await prisma.$transaction([
    prisma.upload.deleteMany(),
    prisma.paymentCoverage.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.publicPaymentSubmission.deleteMany(),
    prisma.specialCollectionAssignment.deleteMany(),
    prisma.specialCollection.deleteMany(),
    prisma.tenantVehicle.deleteMany(),
    prisma.residentVehicle.deleteMany(),
    prisma.tenant.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.resident.deleteMany(),
    prisma.feePlan.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
