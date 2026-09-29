import assert from "node:assert/strict";

// Run only against the temporary database made by preview-fixtures.ts.
const base = process.env.SMOKE_BASE_URL || "http://localhost:3004";
const expected = process.env.PREVIEW_DATABASE_FINGERPRINT;
if (!expected || !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("A loopback preview URL and PREVIEW_DATABASE_FINGERPRINT are required.");
async function request(path, cookie, body) {
  const response = await fetch(new URL(path, base), { method: body ? "POST" : "GET", headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { response, data: await response.json() };
}
const sessions = [];
for (const username of ["Preview1", "Preview2"]) {
  const { response } = await request("/api/auth", null, { action: "login", username, password: "PreviewOnly2026!" });
  assert.equal(response.status, 200); sessions.push(response.headers.get("set-cookie").split(";")[0]);
}
const overview = await request("/api/admin", sessions[0]);
assert.equal(overview.data.database.mode, "local");
assert.equal(overview.data.database.fingerprint, expected, "Refuse to mutate an unexpected database");
assert.equal((await request("/api/admin", sessions[1])).response.status, 403);
assert.equal((await request("/api/admin", null)).response.status, 403);
assert.equal((await request("/api/admin", sessions[1], { action: "grant-admin", targetId: "anything", reason: "unauthorized" })).response.status, 403);
const rooms = {};
for (const game of ["holdem", "omaha"]) {
  const created = await request("/api/rooms", sessions[0], { game, mode: "cash", visibility: "public" });
  assert.equal(created.response.status, 200);
  const id = created.data.id; rooms[game] = id;
  let view = (await request(`/api/rooms/${id}`, sessions[1])).data;
  const join = { action: "join", actionId: crypto.randomUUID(), version: view.version };
  view = (await request(`/api/rooms/${id}`, sessions[1], join)).data;
  const repeated = await request(`/api/rooms/${id}`, sessions[1], join);
  assert.equal(repeated.data.state.players.length, 2);
  const start = { action: "start", actionId: crypto.randomUUID(), version: view.version };
  const started = await request(`/api/rooms/${id}`, sessions[0], start);
  assert.equal(started.response.status, 200);
  const resumed = (await request(`/api/rooms/${id}`, sessions[0])).data;
  assert.equal(resumed.id, id); assert.equal(resumed.state.phase, "preflop");
  assert.equal(resumed.state.players[1].hole.length, 0);
  assert.equal(resumed.state.shoe.length, 0);
  assert.deepEqual(resumed.state.players[0].hole, started.data.state.players[0].hole);
  assert.equal((await request(`/api/rooms/${id}`, sessions[0], start)).data.version, resumed.version);
  assert.equal((await request(`/api/rooms/${id}`, sessions[0], { action: "raise", amount: 1000, actionId: crypto.randomUUID(), version: 0 })).response.status, 400);
}
console.log("HTTP authorization, stale-action rejection, retry deduplication, membership and reconnect redaction passed.");
console.log(JSON.stringify({ liveTwoPlayerRooms: rooms }, null, 2));
