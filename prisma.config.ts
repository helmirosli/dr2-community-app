import "dotenv/config";
import { defineConfig } from "prisma/config";

function buildDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl) return databaseUrl;

  // Build from KK_* environment variables
  const host = process.env.KK_HOST;
  if (!host) {
    throw new Error(
      "DATABASE_URL or KK_* environment variables must be set to a Postgres connection string.\nSee .env.example for examples."
    );
  }

  const port = process.env.KK_PORT ?? "5432";
  const username = process.env.KK_USERNAME ?? "";
  const password = process.env.KK_PASSWORD ?? "";
  const database = process.env.KK_DATABASE ?? "";
  const ssl = process.env.KK_SSL;
  const schemeEnv = process.env.SCHEME ?? "desarestu_db";
  const scheme = schemeEnv === "desarestu_db" ? "postgresql" : schemeEnv;

  let auth = "";
  if (username) {
    auth = encodeURIComponent(username);
    if (password) auth += ":" + encodeURIComponent(password);
    auth += "@";
  }

  const portPart = port ? `:${port}` : "";
  let url = `${scheme}://${auth}${host}${portPart}/${database}?schema=desarestu_db`;
  if (ssl && ssl !== "false" && ssl !== "0") {
    const sslParam = scheme.includes("postgres") || scheme === "postgresql" ? "sslmode=require" : "ssl=true";
    url += "&" + sslParam;
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildDatabaseUrl(),
  },
});