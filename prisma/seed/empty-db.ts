import { clearCoreData, prisma } from "./_client";

async function main() {
  await clearCoreData();
  console.log("Database emptied successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to empty database:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
