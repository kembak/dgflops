import { loadEnvConfig } from "@next/env";
async function main() {
  loadEnvConfig(process.cwd());
  const { databaseStatus, migrateDatabase } = await import("../src/lib/server/store");
  console.log(process.argv.includes("--migrate") ? await migrateDatabase() : await databaseStatus());
}
void main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
