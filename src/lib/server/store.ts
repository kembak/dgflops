import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { databaseConfig } from "./database-config";

export type UserRecord = {
  id: string; username: string | null; passwordHash: string | null; salt: string | null; guest: boolean;
  chips: number; resetDay: string; gamesPlayed: number; wins: number; totalWagered: number;
  chatCount: number; loginDays: number; lastLoginDay: string; createdAt: string;
  role?: "player" | "admin"; suspended?: boolean; muted?: boolean;
};
export type LedgerRecord = { id: string; userId: string; kind: "game" | "achievement"; chipsDelta: number; xp: number; note: string; createdAt: string };
export type RoomRecord = { id: string; code: string; game: string; mode: string; visibility: string; hostId: string;
  state: string; version: number; createdAt: string; updatedAt: string;
  closedAt?: string; closedBy?: string; leaveRequested?: string[]; seen?: Record<string, string>;
  receipts?: Record<string, { userId: string; signature: string }> };
export type MessageRecord = { id: string; roomId: string; userId: string; body: string; createdAt: string };
export type State = { users: Record<string, UserRecord>; sessions: Record<string, { userId: string; expiresAt: string }>;
  ledger: LedgerRecord[]; achievements: { userId: string; id: string; earnedAt: string }[];
  rooms: Record<string, RoomRecord>; messages: MessageRecord[];
  schemaVersion?: number; audit?: { id: string; actorId: string; action: string; targetId: string; reason: string; createdAt: string }[];
  history?: { id: string; roomId: string; round: number; game: string; results: import("../games/house-room").Settlement[]; createdAt: string }[] };

const empty = (): State => ({ users: {}, sessions: {}, ledger: [], achievements: [], rooms: {}, messages: [] });
const localDirectory = join(process.cwd(), "data");
let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

function database(): Client {
  if (client) return client;
  const config = databaseConfig();
  if (config.mode === "local") mkdirSync(dirname(config.file!), { recursive: true });
  client = createClient({ url: config.url, authToken: config.authToken });
  console.info(`[database] mode=${config.mode} fingerprint=${config.fingerprint}`);
  return client;
}

async function ready(): Promise<void> {
  if (!schemaReady) schemaReady = (async () => {
    const db = database();
    await db.execute("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)");
    const existing = await db.execute("SELECT id FROM app_state WHERE id = 1");
    if (existing.rows.length) return;
    let state = empty();
    // Existing local JSON remains untouched and is imported once into local SQLite.
    if (databaseConfig().mode === "local" && !process.env.DG_SQLITE_PATH) {
      try { state = JSON.parse(await readFile(join(localDirectory, "dgflops.json"), "utf8")) as State; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    await db.execute({ sql: "INSERT OR IGNORE INTO app_state (id, data) VALUES (1, ?)", args: [JSON.stringify(state)] });
  })().catch((error) => { schemaReady = undefined; throw error; });
  await schemaReady;
}

async function snapshot(): Promise<State> {
  await ready();
  const result = await database().execute("SELECT data FROM app_state WHERE id = 1");
  return decodeState(String(result.rows[0].data));
}

// Additive snapshot migration: never infer that malformed/unknown data means an empty database.
export function decodeState(data: string): State {
  const state = JSON.parse(data) as State;
  if (!state || !state.users || !state.sessions || !state.rooms || !Array.isArray(state.ledger) || !Array.isArray(state.achievements) || !Array.isArray(state.messages)) throw new Error("Invalid database snapshot. Restore from backup; automatic reset is disabled.");
  if ((state.schemaVersion || 1) > 2) throw new Error("Database schema is newer than this application. Deploy a compatible version.");
  state.audit ??= [];
  state.history ??= [];
  state.schemaVersion = 2;
  return state;
}

export async function migrateDatabase() {
  await ready();
  const tx = await database().transaction("write");
  try {
    await tx.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    await tx.execute("CREATE TABLE IF NOT EXISTS migration_backups (version INTEGER PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)");
    const row = await tx.execute("SELECT data FROM app_state WHERE id = 1");
    const raw = String(row.rows[0].data);
    const state = decodeState(raw);
    await tx.execute({ sql: "INSERT OR IGNORE INTO migration_backups VALUES (2, ?, ?)", args: [raw, new Date().toISOString()] });
    await tx.execute({ sql: "UPDATE app_state SET data = ? WHERE id = 1", args: [JSON.stringify(state)] });
    await tx.execute({ sql: "INSERT OR IGNORE INTO schema_migrations VALUES (2, ?)", args: [new Date().toISOString()] });
    await tx.commit();
  } finally { tx.close(); }
  return databaseStatus();
}

export async function databaseStatus() {
  const config = databaseConfig();
  return read((state) => ({ mode: config.mode, fingerprint: config.fingerprint, schemaVersion: state.schemaVersion,
    users: Object.keys(state.users).length, rooms: Object.keys(state.rooms).length, ledger: state.ledger.length,
    history: state.history?.length || 0, audit: state.audit?.length || 0 }));
}

export function utcDay(date = new Date()): string { return date.toISOString().slice(0, 10); }

function resetWallets(state: State): boolean {
  const day = utcDay();
  let changed = false;
  for (const user of Object.values(state.users)) if (user.resetDay !== day) {
    user.chips = 10000;
    user.resetDay = day;
    changed = true;
  }
  return changed;
}

export async function mutate<T>(fn: (state: State) => T): Promise<T> {
  await ready();
  const tx = await database().transaction("write");
  try {
    const resultSet = await tx.execute("SELECT data FROM app_state WHERE id = 1");
    const state = decodeState(String(resultSet.rows[0].data));
    resetWallets(state);
    const result = fn(state);
    await tx.execute({ sql: "UPDATE app_state SET data = ? WHERE id = 1", args: [JSON.stringify(state)] });
    await tx.commit();
    return result;
  } finally { tx.close(); }
}

export async function read<T>(fn: (state: State) => T): Promise<T> {
  const first = await snapshot();
  if (Object.values(first.users).some((user) => user.resetDay !== utcDay())) {
    await mutate(() => undefined);
    return fn(await snapshot());
  }
  return fn(first);
}
