import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type UserRecord = {
  id: string; username: string | null; passwordHash: string | null; salt: string | null; guest: boolean;
  chips: number; resetDay: string; gamesPlayed: number; wins: number; totalWagered: number;
  chatCount: number; loginDays: number; lastLoginDay: string; createdAt: string;
};
export type LedgerRecord = { id: string; userId: string; kind: "game" | "achievement"; chipsDelta: number; xp: number; note: string; createdAt: string };
export type RoomRecord = { id: string; code: string; game: string; mode: string; visibility: string; hostId: string;
  state: string; version: number; createdAt: string; updatedAt: string };
export type MessageRecord = { id: string; roomId: string; userId: string; body: string; createdAt: string };
export type State = { users: Record<string, UserRecord>; sessions: Record<string, { userId: string; expiresAt: string }>;
  ledger: LedgerRecord[]; achievements: { userId: string; id: string; earnedAt: string }[];
  rooms: Record<string, RoomRecord>; messages: MessageRecord[] };

const empty = (): State => ({ users: {}, sessions: {}, ledger: [], achievements: [], rooms: {}, messages: [] });
const localDirectory = join(process.cwd(), "data");
const remoteUrl = process.env.FLOPSTORAGE_TURSO_DATABASE_URL;
const remoteToken = process.env.FLOPSTORAGE_TURSO_AUTH_TOKEN;
let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

function database(): Client {
  if (client) return client;
  if (Boolean(remoteUrl) !== Boolean(remoteToken) || (process.env.VERCEL && !remoteUrl)) {
    throw new Error("Set FLOPSTORAGE_TURSO_DATABASE_URL and FLOPSTORAGE_TURSO_AUTH_TOKEN together.");
  }
  if (remoteUrl && remoteToken) client = createClient({ url: remoteUrl, authToken: remoteToken });
  else {
    mkdirSync(localDirectory, { recursive: true });
    client = createClient({ url: `file:${join(localDirectory, "dgflops.sqlite")}` });
  }
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
    if (!remoteUrl) {
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
  return JSON.parse(String(result.rows[0].data)) as State;
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
    const state = JSON.parse(String(resultSet.rows[0].data)) as State;
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
