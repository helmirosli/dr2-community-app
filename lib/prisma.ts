import { mkdirSync } from "node:fs";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
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
    console.warn("Could not create local uploads directory:", err);
  }
}

// Neon: use HTTP driver (avoids TCP cold-start latency).
// Supabase / other: use standard pg adapter with connection_limit=1 for serverless.
const isNeon = databaseUrl.includes("neon.tech");

function buildConnectionString(url: string): string {
  // Ensure connection_limit=1 for serverless environments to avoid pool exhaustion.
  // Not needed for Neon (uses HTTP) or local dev (long-lived process).
  if (!isNeon && process.env.NODE_ENV === "production") {
    const u = new URL(url);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    return u.toString();
  }
  return url;
}

const connectionString = buildConnectionString(databaseUrl);

const adapter = isNeon
  ? new PrismaNeon({ connectionString: databaseUrl })
  : new PrismaPg({ connectionString });

const client = new PrismaClient({ adapter });

export const prisma = globalForPrisma.prisma ?? client;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
