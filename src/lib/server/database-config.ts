import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

export function databaseConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.FLOPSTORAGE_TURSO_DATABASE_URL?.trim();
  const authToken = env.FLOPSTORAGE_TURSO_AUTH_TOKEN?.trim();
  const mode = env.DG_DATABASE_MODE;
  if (mode && !["local", "turso"].includes(mode)) throw new Error("DG_DATABASE_MODE must be local or turso.");
  if (Boolean(url) !== Boolean(authToken)) throw new Error("Both FLOPSTORAGE_TURSO variables are required. No database fallback was attempted.");
  if (mode === "local" && (url || env.VERCEL)) throw new Error("Local mode conflicts with Turso credentials or Vercel. Remove DG_DATABASE_MODE=local to use Turso.");
  if (url && authToken) {
    if (!/^libsql:\/\/[^/]+\/?$/.test(url)) throw new Error("Turso requires a libsql:// database URL; filesystem and alternate transports are rejected.");
    return { url, authToken, mode: "turso" as const, fingerprint: createHash("sha256").update(url).digest("hex").slice(0, 12) };
  }
  if (env.VERCEL || mode !== "local") throw new Error("Database not configured. Pull Vercel variables into .env.local for Turso, or explicitly set DG_DATABASE_MODE=local for isolated development.");
  const file = env.DG_SQLITE_PATH ? resolve(/* turbopackIgnore: true */ env.DG_SQLITE_PATH) : join(process.cwd(), "data", "dgflops.sqlite");
  return { url: `file:${file}`, mode: "local" as const, fingerprint: createHash("sha256").update(file).digest("hex").slice(0, 12), file };
}
