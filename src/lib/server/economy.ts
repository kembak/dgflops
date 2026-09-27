import { randomUUID } from "node:crypto";
import type { State } from "./store";

export const achievementCatalog = [
  { id: "first_hand", title: "First hand", description: "Finish your first game", chips: 250, xp: 100 },
  { id: "first_win", title: "In the money", description: "Win a game", chips: 500, xp: 200 },
  { id: "regular", title: "A familiar face", description: "Log in on three different days", chips: 500, xp: 250 },
  { id: "high_roller", title: "High roller", description: "Wager 5,000 chips across games", chips: 1000, xp: 400 },
  { id: "table_talk", title: "Table talk", description: "Send a table chat message", chips: 100, xp: 50 },
] as const;

export function changeChips(state: State, userId: string, delta: number): void {
  const user = state.users[userId];
  if (!user || !Number.isSafeInteger(delta) || user.chips + delta < 0) throw new Error("Not enough chips.");
  user.chips += delta;
}

function awardAvailable(state: State, userId: string): void {
  const user = state.users[userId];
  if (!user || user.guest) return;
  const earned = new Set(state.achievements.filter((item) => item.userId === userId).map((item) => item.id));
  const eligible: Record<string, boolean> = {
    first_hand: user.gamesPlayed >= 1, first_win: user.wins >= 1, regular: user.loginDays >= 3,
    high_roller: user.totalWagered >= 5000, table_talk: user.chatCount >= 1,
  };
  for (const achievement of achievementCatalog) {
    if (!eligible[achievement.id] || earned.has(achievement.id)) continue;
    const now = new Date().toISOString();
    state.achievements.push({ userId, id: achievement.id, earnedAt: now });
    changeChips(state, userId, achievement.chips);
    state.ledger.push({ id: randomUUID(), userId, kind: "achievement", chipsDelta: achievement.chips,
      xp: achievement.xp, note: achievement.title, createdAt: now });
  }
}

export function recordResult(state: State, userId: string, net: number, wagered: number, note: string): void {
  if (!Number.isSafeInteger(net) || !Number.isSafeInteger(wagered) || wagered < 0) throw new Error("Invalid game result.");
  const user = state.users[userId];
  if (!user || user.guest) return;
  state.ledger.push({ id: randomUUID(), userId, kind: "game", chipsDelta: net, xp: net, note, createdAt: new Date().toISOString() });
  user.gamesPlayed++;
  if (net > 0) user.wins++;
  user.totalWagered += wagered;
  awardAvailable(state, userId);
}

export function recordChat(state: State, userId: string): void {
  const user = state.users[userId];
  if (!user) return;
  user.chatCount++;
  awardAvailable(state, userId);
}

export function checkLoginAchievements(state: State, userId: string): void { awardAvailable(state, userId); }

export function progress(state: State, userId: string) {
  const earned = state.achievements.filter((item) => item.userId === userId)
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)).map((item) => ({ id: item.id, earned_at: item.earnedAt }));
  const history = state.ledger.filter((item) => item.userId === userId).slice(-20).reverse()
    .map((item) => ({ kind: item.kind, chips_delta: item.chipsDelta, xp: item.xp, note: item.note, created_at: item.createdAt }));
  return { xp: state.ledger.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.xp, 0), earned, history, catalog: achievementCatalog };
}

export function leaderboard(state: State, period: "weekly" | "all") {
  const today = new Date();
  const weekday = (today.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - weekday)).toISOString();
  return Object.values(state.users).filter((user) => !user.guest).map((user) => {
    const entries = state.ledger.filter((entry) => entry.userId === user.id && (period === "all" || entry.createdAt >= monday));
    return { username: user.username, xp: entries.reduce((sum, entry) => sum + entry.xp, 0),
      game_profit: entries.filter((entry) => entry.kind === "game").reduce((sum, entry) => sum + entry.chipsDelta, 0),
      wins: user.wins, games_played: user.gamesPlayed };
  }).sort((a, b) => b.xp - a.xp || b.wins - a.wins).slice(0, 50);
}
