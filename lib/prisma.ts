import { mkdirSync } from "node:fs";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

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
  throw new Error(
    "DATABASE_URL or KK_* environment variables must be set to a Postgres connection string.\nSee .env.example for examples."
  );
}

if (process.env.NODE_ENV !== "production") {
  try {
    mkdirSync("uploads", { recursive: true });
  } catch (err) {
    // Best-effort in dev: don't crash if the directory can't be created
    // (e.g. unusual permission issues).
    // eslint-disable-next-line no-console
    console.warn("Could not create local uploads directory:", err);
  }
}


const client = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

export const prisma = globalForPrisma.prisma ?? client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}