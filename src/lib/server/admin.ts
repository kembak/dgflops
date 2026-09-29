import { mutate, read, databaseStatus, type State } from "./store";
import { audit, closeRoom } from "./lifecycle";
import type { RoomState } from "./rooms";
import { leaderboard } from "./economy";

export function requireAdmin(store: State, id: string) {
  const user = store.users[id];
  if (!user || user.guest || user.suspended || user.role !== "admin") throw new Error("Administrator access required.");
}

export async function adminOverview(id: string) {
  const overview = await read((store) => {
    requireAdmin(store, id);
    return {
      users: Object.values(store.users).filter((user) => !user.guest).map((user) => ({ id: user.id, username: user.username, chips: user.chips, role: user.role || "player", suspended: !!user.suspended, muted: !!user.muted, gamesPlayed: user.gamesPlayed, createdAt: user.createdAt })),
      rooms: Object.values(store.rooms).map((room) => {
        const state = JSON.parse(room.state) as RoomState;
        return { id: room.id, game: room.game, mode: room.mode, visibility: room.visibility, hostId: room.hostId, phase: state.phase, turn: state.turn, deadline: state.deadline, version: room.version, closedAt: room.closedAt, updatedAt: room.updatedAt,
          players: (state.kind === "house" ? state.seats : state.players).map((player) => ({ id: player.id, name: player.name, lastSeen: room.seen?.[player.id], leaving: room.leaveRequested?.includes(player.id) || false })) };
      }),
      leaderboard: leaderboard(store, "all"), history: (store.history || []).slice(-100).reverse(),
      audit: (store.audit || []).slice(-100).reverse(), records: store.ledger.slice(-100).reverse(),
    };
  });
  return { ...overview, database: await databaseStatus() };
}

export async function administer(actorId: string, action: string, targetId: string, reason: string) {
  if (reason.trim().length < 5 || reason.length > 300) throw new Error("Provide a reason (5–300 characters) for the audit trail.");
  return mutate((store) => {
    requireAdmin(store, actorId);
    if (action === "close-table") {
      const row = store.rooms[targetId];
      if (!row) throw new Error("Table not found.");
      closeRoom(store, row, actorId, reason, true);
      return;
    }
    const user = store.users[targetId];
    if (!user || user.guest) throw new Error("Account not found.");
    if (["revoke-admin", "suspend"].includes(action) && user.role === "admin" && Object.values(store.users).filter((item) => item.role === "admin" && !item.suspended).length <= 1) throw new Error("The last active administrator cannot be removed or suspended.");
    if (action === "grant-admin") user.role = "admin";
    else if (action === "revoke-admin") user.role = "player";
    else if (action === "suspend") {
      user.suspended = true;
      for (const [key, session] of Object.entries(store.sessions)) if (session.userId === targetId) delete store.sessions[key];
    } else if (action === "restore-user") user.suspended = false;
    else if (action === "mute") user.muted = true;
    else if (action === "unmute") user.muted = false;
    else throw new Error("Unknown administrator operation.");
    audit(store, actorId, action, targetId, reason.trim());
  });
}
