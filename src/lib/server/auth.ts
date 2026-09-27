import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { mutate, read, utcDay, type State, type UserRecord } from "./store";
import { checkLoginAchievements } from "./economy";

export type Actor = { id: string; username: string; guest: boolean; chips: number; gamesPlayed: number; wins: number };
const cookieName = "dgflops_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const actor = (user: UserRecord): Actor => ({ id: user.id, username: user.username || `Guest ${user.id.slice(0, 4)}`,
  guest: user.guest, chips: user.chips, gamesPlayed: user.gamesPlayed, wins: user.wins });

export async function getActor(request: NextRequest): Promise<Actor | null> {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return read((state) => {
    const session = state.sessions[hash(token)];
    const user = session?.expiresAt > new Date().toISOString() ? state.users[session.userId] : null;
    return user ? actor(user) : null;
  });
}

function issueSession(state: State, userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  state.sessions[hash(token)] = { userId, expiresAt: expires.toISOString() };
  return { token, expires };
}

export function sessionCookie(session: { token: string; expires: Date }) {
  return { name: cookieName, value: session.token, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires: session.expires };
}

export async function removeSession(request: NextRequest): Promise<void> {
  const token = request.cookies.get(cookieName)?.value;
  if (token) await mutate((state) => { delete state.sessions[hash(token)]; });
}

function passwordHash(password: string, salt: string): string { return scryptSync(password, salt, 64).toString("hex"); }
function verifyPassword(password: string, salt: string, expected: string): boolean {
  const actual = Buffer.from(passwordHash(password, salt), "hex");
  const stored = Buffer.from(expected, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

export async function register(username: string, password: string) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(username)) throw new Error("Username must be 3–20 letters, numbers, or underscores, starting with a letter.");
  if (password.length < 8 || password.length > 128) throw new Error("Password must be 8–128 characters.");
  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  return mutate((state) => {
    if (Object.values(state.users).some((user) => user.username?.toLowerCase() === username.toLowerCase())) throw new Error("That username is already taken.");
    const day = utcDay();
    const user: UserRecord = { id, username, passwordHash: passwordHash(password, salt), salt, guest: false, chips: 10000,
      resetDay: day, gamesPlayed: 0, wins: 0, totalWagered: 0, chatCount: 0, loginDays: 1, lastLoginDay: day, createdAt: new Date().toISOString() };
    state.users[id] = user;
    return { user: actor(user), session: issueSession(state, id) };
  });
}

export async function login(username: string, password: string) {
  return mutate((state) => {
    const user = Object.values(state.users).find((item) => !item.guest && item.username?.toLowerCase() === username.toLowerCase());
    if (!user || !user.salt || !user.passwordHash || !verifyPassword(password, user.salt, user.passwordHash)) throw new Error("Invalid username or password.");
    const day = utcDay();
    if (user.lastLoginDay !== day) { user.loginDays++; user.lastLoginDay = day; }
    checkLoginAchievements(state, user.id);
    return { user: actor(user), session: issueSession(state, user.id) };
  });
}

export async function createGuest() {
  const id = randomUUID();
  return mutate((state) => {
    const day = utcDay();
    const user: UserRecord = { id, username: null, passwordHash: null, salt: null, guest: true, chips: 10000,
      resetDay: day, gamesPlayed: 0, wins: 0, totalWagered: 0, chatCount: 0, loginDays: 1, lastLoginDay: day, createdAt: new Date().toISOString() };
    state.users[id] = user;
    return { user: actor(user), session: issueSession(state, id) };
  });
}

export function validOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.nextUrl.host; }
  catch { return false; }
}
