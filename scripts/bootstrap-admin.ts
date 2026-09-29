import { loadEnvConfig } from "@next/env";
import { audit } from "../src/lib/server/lifecycle";

async function main() {
  loadEnvConfig(process.cwd());
  const { mutate } = await import("../src/lib/server/store");
  const username = process.argv[2];
  if (!username) throw new Error("Usage: npm run admin:bootstrap -- ExactUsername. Create the account normally first.");
  await mutate((state) => {
    if (Object.values(state.users).some((user) => user.role === "admin" && !user.suspended)) throw new Error("An active administrator already exists. Use the authorized admin panel to manage roles.");
    const user = Object.values(state.users).find((item) => !item.guest && !item.suspended && item.username === username);
    if (!user) throw new Error("Active account not found. No changes made.");
    user.role = "admin";
    audit(state, "operator", "bootstrap-admin", user.id, "Explicit operator bootstrap command");
  });
  console.log("Initial administrator assigned. Sign in again to refresh the interface.");
}
void main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
