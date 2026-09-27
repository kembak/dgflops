import assert from "node:assert/strict";

// Run against an already-started local app; no accounts or rooms are created.
const base = process.env.SMOKE_BASE_URL || "http://localhost:3002";
for (const path of ["/", "/leaderboard", "/profile", "/room/presentation-check"]) {
  const response = await fetch(new URL(path, base));
  const html = await response.text();
  assert.equal(response.status, 200, `${path} responds successfully`);
  assert.equal((html.match(/<audio[ >]/g) || []).length, 1, `${path}: only one audio element`);
  assert.ok(html.includes('aria-label="Top music player"'), `${path}: top player present`);
  assert.ok(html.includes('aria-label="Floating music player"') || html.includes('aria-label="Restore floating music player"'), `${path}: floating player or restore present`);
  assert.ok(html.includes('aria-label="Appearance"'), `${path}: appearance switch present`);
  console.log(`${path}: 200, one audio element, shared player views, appearance control`);
}
