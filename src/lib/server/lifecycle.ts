import { randomUUID } from "node:crypto";
import type { State, RoomRecord } from "./store";
import type { RoomState } from "./rooms";
import { changeChips, recordResult } from "./economy";
import { actHouse, type Effect } from "../games/house-room";
import { actPoker } from "../games/poker-room";

export const isMember = (state: RoomState, id: string) => state.kind === "house" ? state.seats.some((seat) => seat.id === id) : state.players.some((player) => player.id === id);
export const isActive = (state: RoomState) => !["betting", "waiting", "finished", "complete"].includes(state.phase);

export function applyRoomEffects(store: State, row: RoomRecord, state: RoomState, effect: Effect) {
  for (const item of effect.transfers) changeChips(store, item.userId, item.chips);
  for (const item of effect.results) recordResult(store, item.userId, item.net, item.wagered, item.note);
  if (effect.results.length) {
    store.history ??= [];
    store.history.push({ id: randomUUID(), roomId: row.id, round: state.kind === "house" ? state.round : state.hand, game: row.game, results: effect.results, createdAt: new Date().toISOString() });
  }
}

export function saveRoom(row: RoomRecord, state: RoomState) {
  row.state = JSON.stringify(state); row.version++; row.updatedAt = new Date().toISOString();
}

export function audit(store: State, actorId: string, action: string, targetId: string, reason: string) {
  (store.audit ??= []).push({ id: randomUUID(), actorId, action, targetId, reason, createdAt: new Date().toISOString() });
}

export function flushDepartures(store: State, row: RoomRecord, state: RoomState) {
  if (isActive(state)) return;
  for (const id of row.leaveRequested || []) {
    if (state.kind === "house") {
      if (state.phase === "betting" && state.bets[id]) {
        const bet = state.bets[id];
        changeChips(store, id, bet.amount * (state.game === "ultimate" ? 2 : 1));
        delete state.bets[id];
      }
      state.seats = state.seats.filter((seat) => seat.id !== id);
    } else if (isMember(state, id)) {
      if (state.mode === "tournament" && state.started && state.phase !== "complete") continue;
      applyRoomEffects(store, row, state, actPoker(state, id, "leave"));
    }
  }
  row.leaveRequested = (row.leaveRequested || []).filter((id) => isMember(state, id));
  if (!isMember(state, row.hostId)) row.hostId = (state.kind === "house" ? state.seats : state.players)[0]?.id || row.hostId;
}

// Lazy server clock: recover expired turns on the next room read/action, with bounded work.
export function advanceExpired(store: State, row: RoomRecord, state: RoomState, now = Date.now()) {
  for (let count = 0; count < 12 && state.turn && (state.deadline <= now || row.leaveRequested?.includes(state.turn)); count++) {
    const id = state.turn;
    const turnTime = row.leaveRequested?.includes(id) ? now : state.deadline || now;
    const effect = state.kind === "house"
      ? actHouse(state, id, state.game === "ultimate" ? state.stage === "river" ? "fold" : "check" : "stand", 0, undefined, { now: turnTime })
      : actPoker(state, id, state.currentBet === state.players.find((player) => player.id === id)?.bet ? "check" : "fold", 0, { now: turnTime });
    applyRoomEffects(store, row, state, effect);
  }
  flushDepartures(store, row, state);
}

export function closeRoom(store: State, row: RoomRecord, actorId: string, reason: string, force = false) {
  if (row.closedAt) return;
  const state = JSON.parse(row.state) as RoomState;
  if (isActive(state) && !force) throw new Error("Wait for the current round to finish. An administrator can safely void a stuck round.");
  if (state.kind === "house") {
    if (state.phase !== "finished") for (const [id, bet] of Object.entries(state.bets)) {
      const hands = state.blackjackHands?.[id];
      const refund = state.game === "ultimate" ? bet.amount * 2 + bet.play : hands?.length ? hands.reduce((sum, hand) => sum + hand.amount * (hand.doubled ? 2 : 1), 0) : bet.amount * (bet.doubled ? 2 : 1);
      changeChips(store, id, refund);
    }
  } else if (state.mode === "cash") {
    for (const player of state.players) changeChips(store, player.id, player.stack + (isActive(state) ? player.contributed : 0));
  } else if (state.phase !== "complete") {
    for (const player of state.players) changeChips(store, player.id, 1000);
  }
  row.closedAt = new Date().toISOString(); row.closedBy = actorId; state.turn = null;
  saveRoom(row, state);
  audit(store, actorId, force ? "void-and-close-table" : "close-table", row.id, reason);
}
