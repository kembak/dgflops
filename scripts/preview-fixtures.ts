// Creates ONLY a new temporary database. Never seeds the configured application DB.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Actor } from "../src/lib/server/auth";

async function main() {
  process.env.DG_DATABASE_MODE = "local";
  process.env.DG_SQLITE_PATH = join(mkdtempSync(join(tmpdir(), "dgflops-preview-")), "preview.sqlite");
  delete process.env.FLOPSTORAGE_TURSO_DATABASE_URL; delete process.env.FLOPSTORAGE_TURSO_AUTH_TOKEN; delete process.env.VERCEL;
  const { register } = await import("../src/lib/server/auth");
  const { mutate, migrateDatabase } = await import("../src/lib/server/store");
  const { createRoom, updateRoom, sendMessage } = await import("../src/lib/server/rooms");
  const actors: Actor[] = [];
  for (let i = 1; i <= 6; i++) actors.push((await register(`Preview${i}`, "PreviewOnly2026!")).user);
  await mutate((store) => { store.users[actors[0].id].role = "admin"; });
  const rooms: Record<string, string> = {};
  for (const game of ["blackjack", "ultimate", "baccarat", "holdem", "omaha"]) {
    const room = await createRoom(actors[0], game, "cash", "public");
    rooms[game] = room.id;
    for (const actor of actors.slice(1)) await updateRoom(actor, room.id, "join");
    if (["blackjack", "ultimate", "baccarat"].includes(game)) for (const actor of actors) await updateRoom(actor, room.id, "bet", 100, "player");
    await updateRoom(actors[0], room.id, "start");
    for (const actor of actors) await sendMessage(actor, room.id, `Hello from ${actor.username}. This is an isolated preview fixture.`);
  }
  await migrateDatabase();
  console.log(JSON.stringify({ path: process.env.DG_SQLITE_PATH, username: "Preview1", password: "PreviewOnly2026!", rooms }, null, 2));
}
void main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
