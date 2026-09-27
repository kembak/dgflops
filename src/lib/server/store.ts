import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
const localPath = join(process.cwd(), "data", "dgflops.json");
const remoteUrl = process.env.UPSTASH_REDIS_REST_URL;
const remoteToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const remoteKey = "dgflops:state:v1";
let localQueue = Promise.resolve();

function configuration(): "remote" | "local" {
  if (remoteUrl && remoteToken) return "remote";
  if (process.env.VERCEL) throw new Error("Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.");
  return "local";
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const response = await fetch(remoteUrl!, { method: "POST", headers: { authorization: `Bearer ${remoteToken}`, "content-type": "application/json" },
    body: JSON.stringify(command), cache: "no-store" });
  if (!response.ok) throw new Error(`Data service error (${response.status}).`);
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error(`Data service error: ${result.error}`);
  return result.result;
}

async function snapshot(): Promise<{ raw: string; state: State }> {
  let raw = "";
  if (configuration() === "remote") raw = String(await redis(["GET", remoteKey]) || "");
  else {
    try { raw = await readFile(localPath, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return { raw, state: raw ? JSON.parse(raw) as State : empty() };
}

async function compareAndSet(before: string, after: string): Promise<boolean> {
  if (configuration() === "remote") {
    const script = "local current=redis.call('GET',KEYS[1]); if (current or '') ~= ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1";
    return Number(await redis(["EVAL", script, 1, remoteKey, before, after])) === 1;
  }
  const previous = localQueue;
  let release!: () => void;
  localQueue = new Promise<void>((done) => { release = done; });
  await previous;
  try {
    let current = "";
    try { current = await readFile(localPath, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (current !== before) return false;
    await mkdir(dirname(localPath), { recursive: true });
    await writeFile(localPath, after, "utf8");
    return true;
  } finally { release(); }
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
  for (let attempt = 0; attempt < 12; attempt++) {
    const { raw, state } = await snapshot();
    resetWallets(state);
    const result = fn(state);
    if (await compareAndSet(raw, JSON.stringify(state))) return result;
  }
  throw new Error("The table is busy. Please try again.");
}

export async function read<T>(fn: (state: State) => T): Promise<T> {
  const first = await snapshot();
  if (Object.values(first.state.users).some((user) => user.resetDay !== utcDay())) {
    await mutate(() => undefined);
    return fn((await snapshot()).state);
  }
  return fn(first.state);
}
