/**
 * Database backup script
 * Dumps the PostgreSQL database and uploads the compressed file to GCS.
 *
 * Usage:
 *   npm run db:backup
 *
 * Required env vars:
 *   DATABASE_URL_DIRECT          — Session pooler URL (port 5432) for pg_dump
 *   GCS_BUCKET_NAME              — destination bucket
 *   GCS_SERVICE_ACCOUNT_JSON_B64 — base64 of full service-account JSON (preferred)
 *   OR: GCS_PROJECT_ID + GCS_CLIENT_EMAIL + GCS_PRIVATE_KEY (local .env fallback)
 */

import { spawnSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { Storage } from "@google-cloud/storage";

// ── Config ────────────────────────────────────────────────────────────────────

const dbUrl      = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
const bucketName = process.env.GCS_BUCKET_NAME;

// GCS auth: prefer full service-account JSON blob (survives GitHub Secrets intact).
// To generate: base64 -i service-account.json | tr -d '\n'
// Store as GCS_SERVICE_ACCOUNT_JSON_B64.
const gcsCredentials = (() => {
  const b64 = process.env.GCS_SERVICE_ACCOUNT_JSON_B64;
  if (b64) {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  }
  // Fallback for local .env: individual vars
  return {
    project_id:   process.env.GCS_PROJECT_ID  ?? "",
    client_email: process.env.GCS_CLIENT_EMAIL ?? "",
    private_key:  (process.env.GCS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  };
})();

if (!dbUrl) throw new Error("DATABASE_URL_DIRECT (or DATABASE_URL) is not set");
if (dbUrl.includes(":6543")) {
  throw new Error(
    "DATABASE_URL_DIRECT must not use the Transaction pooler (port 6543).\n" +
    "  Use the Session pooler (port 5432): Supabase → Settings → Database → Connection pooling → Session mode."
  );
}
if (!bucketName) throw new Error("GCS_BUCKET_NAME is not set");
if (!gcsCredentials.client_email || !gcsCredentials.private_key) {
  throw new Error(
    "GCS auth not configured.\n" +
    "  Set GCS_SERVICE_ACCOUNT_JSON_B64 (preferred) or GCS_PROJECT_ID + GCS_CLIENT_EMAIL + GCS_PRIVATE_KEY."
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePostgresUrl(url: string) {
  const u = new URL(url);
  return {
    host:     u.hostname,
    port:     u.port || "5432",
    user:     decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const conn = parsePostgresUrl(dbUrl!);
  const ts   = timestamp();
  const filename = `backup-${ts}.sql.gz`;
  const tmpFile  = path.join(os.tmpdir(), filename);

  console.log(`\n📦  Starting backup → ${filename}`);
  console.log(`    Database : ${conn.host}/${conn.database}`);
  console.log(`    Bucket   : ${bucketName}\n`);

  // ── 1. pg_dump | gzip → temp file ─────────────────────────────────────────
  const pgDumpBin =
    process.env.PG_DUMP_BIN ??
    [
      "/opt/homebrew/opt/postgresql@17/bin/pg_dump",
      "/usr/local/opt/postgresql@17/bin/pg_dump",
    ].find((p) => existsSync(p)) ??
    "pg_dump";

  const env = { ...process.env, PGPASSWORD: conn.password };

  console.log("⏳  Running pg_dump...");

  const cmd = [
    "set -e -o pipefail",
    `${pgDumpBin} -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.database} --no-owner --no-acl --schema=desarestu_db`,
    `gzip > ${tmpFile}`,
  ].join(" | ");

  const result = spawnSync("bash", ["-c", cmd], {
    env: { ...env, PGSSLMODE: "require" },
    stdio: ["inherit", "inherit", "pipe"],
  });

  const stderr = result.stderr?.toString().trim();
  if (stderr) console.error("pg_dump stderr:\n", stderr);
  if (result.status !== 0) {
    throw new Error(`pg_dump failed (exit ${result.status})${stderr ? `:\n${stderr}` : ""}`);
  }
  if (!existsSync(tmpFile)) {
    throw new Error(`Backup file not created: ${tmpFile}`);
  }

  const { statSync } = await import("node:fs");
  const sizeBytes = statSync(tmpFile).size;
  if (sizeBytes < 100) {
    throw new Error(`Backup file is suspiciously small (${sizeBytes} bytes) — pg_dump likely produced no output. Check DATABASE_URL_DIRECT.`);
  }
  console.log(`✅  pg_dump complete (${(sizeBytes / 1024).toFixed(1)} KB compressed)\n`);

  // ── 2. Upload to GCS ───────────────────────────────────────────────────────
  const destPath = `db-backups/${filename}`;

  // In CI (GitHub Actions), auth is handled by google-github-actions/auth and
  // upload is done via gsutil — skip SDK upload here.
  if (process.env.CI) {
    // Write the destination path so the workflow step can read it
    console.log(`BACKUP_FILE=${tmpFile}`);
    console.log(`BACKUP_DEST=gs://${bucketName}/${destPath}`);
    console.log("\n✅  Dump ready for upload by workflow.\n");
    return;
  }

  console.log("⏳  Uploading to GCS...");

  const storage = new Storage({
    projectId:   gcsCredentials.project_id,
    credentials: {
      client_email: gcsCredentials.client_email,
      private_key:  gcsCredentials.private_key,
    },
  });

  const bucket = storage.bucket(bucketName!);

  await bucket.upload(tmpFile, {
    destination: destPath,
    gzip: false,
    metadata: {
      contentType: "application/gzip",
      metadata: { database: conn.database, host: conn.host, backedAt: new Date().toISOString() },
    },
  });

  console.log(`✅  Uploaded → gs://${bucketName}/${destPath}\n`);

  // ── 3. Clean up ────────────────────────────────────────────────────────────
  unlinkSync(tmpFile);
  console.log("🗑️   Temp file removed");
  console.log("\n🎉  Backup complete!\n");
}

main().catch((err) => {
  console.error("\n❌  Backup failed:", err.message);
  process.exit(1);
});
