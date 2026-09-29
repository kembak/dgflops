import { randomBytes, randomUUID } from "node:crypto";
import { mutate, read, type State, type RoomRecord } from "./store";
import { changeChips, recordChat, recordResult } from "./economy";
import type { Actor } from "./auth";
import { actHouse, newHouseState, viewHouse, type HouseGame, type HouseState, type Effect } from "../games/house-room";
import type { BaccaratSide } from "../games/house";
import { actPoker, joinPoker, newPokerState, viewPoker, type PokerGame, type PokerMode, type PokerState } from "../games/poker-room";
import { advanceExpired, applyRoomEffects, closeRoom, flushDepartures, saveRoom } from "./lifecycle";

export type RoomState = HouseState | PokerState;
const games = ["blackjack", "baccarat", "ultimate", "holdem", "omaha"];
const member = (state: RoomState, id: string) => state.kind === "house" ? state.seats.some((seat) => seat.id === id) : state.players.some((player) => player.id === id);

function applyEffects(state: State, effect: Effect): void {
  for (const transfer of effect.transfers) changeChips(state, transfer.userId, transfer.chips);
  for (const result of effect.results) recordResult(state, result.userId, result.net, result.wagered, result.note);
}

function summary(row: RoomRecord) {
  const state = JSON.parse(row.state) as RoomState;
  return { id: row.id, game: row.game, mode: row.mode, visibility: row.visibility, phase: state.phase,
    players: state.kind === "house" ? state.seats.length : state.players.length, maxPlayers: 6, updatedAt: row.updatedAt };
}

export async function listRooms() {
  return read((state) => Object.values(state.rooms).filter((row) => row.visibility === "public" && !row.closedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50).map(summary));
}

export async function createRoom(actor: Actor, game: string, mode: string, visibility: string) {
  if (!games.includes(game)) throw new Error("Choose a game.");
  const isHouse = ["blackjack", "baccarat", "ultimate"].includes(game);
  if (actor.guest && (!isHouse || visibility !== "solo")) throw new Error("Guests can only play solo house games.");
  if (!["public", "private", "solo"].includes(visibility)) throw new Error("Choose a room type.");
  if (!isHouse && !["cash", "tournament"].includes(mode)) throw new Error("Choose a poker mode.");
  const id = randomUUID();
  const code = randomBytes(4).toString("hex").toUpperCase();
  return mutate((store) => {
    const state: RoomState = isHouse ? newHouseState(game as HouseGame) : newPokerState(game as PokerGame, mode as PokerMode);
    if (state.kind === "house") state.seats.push({ id: actor.id, name: actor.username });
    else applyEffects(store, joinPoker(state, actor.id, actor.username));
    const now = new Date().toISOString();
    store.rooms[id] = { id, code, game, mode: isHouse ? "house" : mode, visibility, hostId: actor.id,
      state: JSON.stringify(state), version: 0, createdAt: now, updatedAt: now };
    return { id, code };
  });
}

export async function joinCode(actor: Actor, code: string) {
  if (actor.guest) throw new Error("Create an account to join friends.");
  return mutate((store) => {
    const row = Object.values(store.rooms).find((item) => item.code === code.toUpperCase() && item.visibility === "private" && !item.closedAt);
    if (!row) throw new Error("Room code not found.");
    const state = JSON.parse(row.state) as RoomState;
    if (!member(state, actor.id)) {
      if (state.kind === "house") {
        if (state.seats.length >= 6) throw new Error("This table is full.");
        state.seats.push({ id: actor.id, name: actor.username });
      } else applyEffects(store, joinPoker(state, actor.id, actor.username));
      row.state = JSON.stringify(state);
      row.version++;
      row.updatedAt = new Date().toISOString();
    }
    return { id: row.id };
  });
}

function roomView(store: State, actor: Actor, id: string) {
  const row = store.rooms[id];
  if (!row) throw new Error("Room not found.");
  const state = JSON.parse(row.state) as RoomState;
  const seated = member(state, actor.id);
  if (!seated && row.visibility !== "public" && row.hostId !== actor.id && !row.seen?.[actor.id]) throw new Error("Join this room with its code.");
  const messages = seated ? store.messages.filter((message) => message.roomId === id).slice(-50).map((message) => ({
    id: message.id, body: message.body, createdAt: message.createdAt,
    username: store.users[message.userId]?.username || `Guest ${message.userId.slice(0, 4)}`,
  })) : [];
  return { id, code: seated ? row.code : null, game: row.game, mode: row.mode, visibility: row.visibility,
    hostId: row.hostId, version: row.version, seated, closedAt: row.closedAt, leaving: row.leaveRequested?.includes(actor.id) || false,
    canDelete: row.hostId === actor.id || store.users[actor.id]?.role === "admin",
    state: state.kind === "house" ? viewHouse(state, actor.id) : viewPoker(state, actor.id), messages };
}

export async function getRoom(actor: Actor, id: string) {
  const initial = await read((store) => {
    const view = roomView(store, actor, id);
    const row = store.rooms[id];
    return { view, needsUpdate: !row.closedAt && ((!!view.state.turn && (view.state.deadline <= Date.now() || row.leaveRequested?.includes(view.state.turn))) || (view.seated && Date.now() - Date.parse(row.seen?.[actor.id] || "1970-01-01") > 15000)) };
  });
  if (!initial.needsUpdate) return initial.view;
  return mutate((store) => {
    roomView(store, actor, id); // Authorize before touching the clock.
    const row = store.rooms[id];
    const state = JSON.parse(row.state) as RoomState;
    if (!row.closedAt) {
      const before = JSON.stringify(state);
      advanceExpired(store, row, state);
      if (before !== JSON.stringify(state)) saveRoom(row, state);
      if (member(state, actor.id)) (row.seen ??= {})[actor.id] = new Date().toISOString();
    }
    return roomView(store, actor, id);
  });
}

export async function updateRoom(actor: Actor, id: string, action: string, amount = 0, side?: BaccaratSide, operation?: { id: string; version: number }) {
  return mutate((store) => {
    const row = store.rooms[id];
    if (!row) throw new Error("Room not found.");
    const signature = JSON.stringify([action, amount, side]);
    if (operation) {
      if (!/^[a-zA-Z0-9-]{16,80}$/.test(operation.id)) throw new Error("Invalid action identifier.");
      const previous = row.receipts?.[operation.id];
      if (previous) {
        if (previous.userId !== actor.id || previous.signature !== signature) throw new Error("Action identifier was already used.");
        return roomView(store, actor, id);
      }
      if (operation.version !== row.version) throw new Error("The table changed. Your action was not applied; refresh and try again.");
    }
    if (row.closedAt) throw new Error("This table is closed.");
    const state = JSON.parse(row.state) as RoomState;
    let effect: Effect = { transfers: [], results: [] };
    if (action === "join") {
      if (actor.guest || row.visibility !== "public") throw new Error("This table is not joinable.");
      if (member(state, actor.id)) return roomView(store, actor, id);
      if (state.kind === "house") {
        if (state.seats.length >= 6) throw new Error("This table is full.");
        state.seats.push({ id: actor.id, name: actor.username });
      } else effect = joinPoker(state, actor.id, actor.username);
    } else {
      if (!member(state, actor.id)) throw new Error("Join the table first.");
      (row.seen ??= {})[actor.id] = new Date().toISOString();
      if (action === "delete") {
        if (row.hostId !== actor.id && store.users[actor.id]?.role !== "admin") throw new Error("Only the host or an administrator can delete this table.");
        closeRoom(store, row, actor.id, "Confirmed table deletion", store.users[actor.id]?.role === "admin");
        return roomView(store, actor, id);
      } else if (action === "leave") {
        row.leaveRequested = [...new Set([...(row.leaveRequested || []), actor.id])];
        advanceExpired(store, row, state);
      } else if (action === "tick") {
        if (!state.turn || state.deadline > Date.now()) return roomView(store, actor, id);
        const target = state.turn;
        if (state.kind === "house") effect = actHouse(state, target, state.game === "ultimate" ? state.stage === "river" ? "fold" : "check" : "stand");
        else effect = actPoker(state, target, state.currentBet === state.players.find((player) => player.id === target)?.bet ? "check" : "fold");
      } else if (state.kind === "house") {
        effect = actHouse(state, actor.id, action, amount, side);
      } else effect = actPoker(state, actor.id, action, amount);
    }
    applyRoomEffects(store, row, state, effect);
    flushDepartures(store, row, state);
    if (operation) {
      (row.receipts ??= {})[operation.id] = { userId: actor.id, signature };
      for (const key of Object.keys(row.receipts).slice(0, -256)) delete row.receipts[key];
    }
    saveRoom(row, state);
    return roomView(store, actor, id);
  });
}

export async function sendMessage(actor: Actor, id: string, body: string) {
  if (actor.guest) throw new Error("Create an account to chat.");
  const text = body.trim();
  if (!text || text.length > 300) throw new Error("Messages must be 1–300 characters.");
  return mutate((store) => {
    const row = store.rooms[id];
    if (!row || row.closedAt || !member(JSON.parse(row.state) as RoomState, actor.id)) throw new Error("Join an open table to chat.");
    if (store.users[actor.id]?.muted) throw new Error("Chat is currently muted for this account.");
    const last = store.messages.filter((message) => message.roomId === id && message.userId === actor.id).at(-1);
    if (last && Date.now() - Date.parse(last.createdAt) < 1000) throw new Error("Please wait before sending another message.");
    store.messages.push({ id: randomUUID(), roomId: id, userId: actor.id, body: text, createdAt: new Date().toISOString() });
    recordChat(store, actor.id);
    return roomView(store, actor, id);
  });
}
