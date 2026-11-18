// Moves receipts that still have a direct link to another bucket into the bucket in .env, then drops the
// link so they open through the signed-in route. Dry run by default: npm run uploads:relink [-- --apply]
import { Storage } from "@google-cloud/storage";

import { prisma } from "@/lib/prisma";

const apply = process.argv.includes("--apply");
const bucketName = process.env.GCS_BUCKET_NAME!;
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: { client_email: process.env.GCS_CLIENT_EMAIL, private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, "\n") },
});

async function main() {
  const rows = await prisma.upload.findMany({ where: { url: { not: null } }, select: { id: true, url: true, storagePath: true, mimeType: true } });
  console.log(`${rows.length} upload(s) with a direct link${apply ? "" : " (dry run, nothing changed)"}`);
  let moved = 0;
  let failed = 0;
  for (const r of rows) {
    if (!apply) {
      console.log(`  would move ${r.storagePath} from ${new URL(r.url!).pathname.split("/")[1]}`);
      continue;
    }
    try {
      const res = await fetch(r.url!);
      if (!res.ok) throw new Error(`download ${res.status}`);
      await storage.bucket(bucketName).file(r.storagePath).save(Buffer.from(await res.arrayBuffer()), { contentType: r.mimeType });
      await prisma.upload.update({ where: { id: r.id }, data: { url: null } });
      moved += 1;
    } catch (e) {
      failed += 1;
      console.error(`  FAILED ${r.storagePath}: ${(e as Error).message}`);
    }
  }
  if (apply) console.log(`moved ${moved}, failed ${failed}`);
}

main().finally(() => prisma.$disconnect());
