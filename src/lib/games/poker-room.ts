import { deck, take, type Card } from "./cards";
import { bestHand } from "./poker";
import type { Effect, Settlement } from "./house-room";

export type PokerGame = "holdem" | "omaha";
export type PokerMode = "cash" | "tournament";
export type PokerPlayer = {
  id: string; name: string; stack: number; bet: number; contributed: number;
  folded: boolean; acted: boolean; hole: Card[]; lastAction: string;
};
export type PokerState = {
  kind: "poker"; game: PokerGame; mode: PokerMode;
  phase: "waiting" | "preflop" | "flop" | "turn" | "river" | "finished" | "complete";
  players: PokerPlayer[]; button: number; turn: string | null; deadline: number;
  board: Card[]; shoe: Card[]; pot: number; currentBet: number; minRaise: number;
  hand: number; message: string; started: boolean;
};

const emptyEffect = (): Effect => ({ transfers: [], results: [] });
const buyIn = 1000;
const active = (state: PokerState) => state.players.filter((player) => player.hole.length && !player.folded);
const available = (player: PokerPlayer) => !player.folded && player.stack > 0 && player.hole.length > 0;

export function newPokerState(game: PokerGame, mode: PokerMode): PokerState {
  return { kind: "poker", game, mode, phase: "waiting", players: [], button: -1, turn: null, deadline: 0,
    board: [], shoe: [], pot: 0, currentBet: 0, minRaise: 20, hand: 0, message: "Join the table to play.", started: false };
}

function nextSeat(state: PokerState, after: number, predicate: (player: PokerPlayer) => boolean): number {
  for (let offset = 1; offset <= state.players.length; offset++) {
    const index = (after + offset) % state.players.length;
    if (predicate(state.players[index])) return index;
  }
  return -1;
}

function setTurn(state: PokerState, after: number): void {
  const index = nextSeat(state, after, (player) => available(player) && (!player.acted || player.bet < state.currentBet));
  state.turn = index < 0 ? null : state.players[index].id;
  state.deadline = state.turn ? Date.now() + 60000 : 0;
}

function putIn(state: PokerState, player: PokerPlayer, amount: number): void {
  const paid = Math.min(amount, player.stack);
  player.stack -= paid;
  player.bet += paid;
  player.contributed += paid;
  state.pot += paid;
}

function settle(state: PokerState, effect: Effect): void {
  const levels = [...new Set(state.players.map((player) => player.contributed).filter((amount) => amount > 0))].sort((a, b) => a - b);
  const payouts = new Map<string, number>();
  let previous = 0;
  for (const level of levels) {
    const invested = state.players.filter((player) => player.contributed >= level);
    const pot = (level - previous) * invested.length;
    previous = level;
    const contenders = invested.filter((player) => !player.folded);
    if (!contenders.length && invested.length === 1) {
      payouts.set(invested[0].id, (payouts.get(invested[0].id) || 0) + pot);
      continue;
    }
    if (!contenders.length) throw new Error("No player can claim the pot.");
    const scores = contenders.map((player) => ({ player, score: state.board.length === 5 ? bestHand(player.hole, state.board, state.game).score : 0 }));
    const high = Math.max(...scores.map((item) => item.score));
    const winners = scores.filter((item) => item.score === high).map((item) => item.player);
    const share = Math.floor(pot / winners.length);
    let remainder = pot % winners.length;
    for (const player of winners) payouts.set(player.id, (payouts.get(player.id) || 0) + share + (remainder-- > 0 ? 1 : 0));
  }
  for (const player of state.players) {
    const payout = payouts.get(player.id) || 0;
    player.stack += payout;
    if (player.contributed > 0 && state.mode === "cash") {
      const result: Settlement = { userId: player.id, payout, wagered: player.contributed, net: payout - player.contributed,
        note: `${state.game} ${state.mode}: ${state.board.length === 5 && !player.folded ? bestHand(player.hole, state.board, state.game).name : player.folded ? "Fold" : "Uncontested pot"}` };
      effect.results.push(result);
    }
  }
  state.message = state.players.filter((player) => (payouts.get(player.id) || 0) > 0)
    .map((player) => `${player.name} won ${payouts.get(player.id)} chips`).join(" · ");
  state.phase = "finished";
  state.turn = null;
  if (state.mode === "tournament" && state.started) {
    const survivors = state.players.filter((player) => player.stack > 0);
    if (survivors.length === 1) {
      const winner = survivors[0];
      const prize = state.players.length * buyIn;
      effect.transfers.push({ userId: winner.id, chips: prize });
      for (const player of state.players) effect.results.push({ userId: player.id, payout: player.id === winner.id ? prize : 0,
        wagered: buyIn, net: (player.id === winner.id ? prize : 0) - buyIn, note: `${state.game} tournament` });
      state.phase = "complete";
      state.message = `${winner.name} wins the tournament and ${prize} chips!`;
    }
  }
}

function advance(state: PokerState, effect: Effect, after: number): void {
  if (active(state).length === 1) { settle(state, effect); return; }
  const waiting = active(state).some((player) => player.stack > 0 && (!player.acted || player.bet !== state.currentBet));
  if (waiting) { setTurn(state, after); return; }
  if (state.phase === "river") { settle(state, effect); return; }
  state.phase = state.phase === "preflop" ? "flop" : state.phase === "flop" ? "turn" : "river";
  state.board.push(...take(state.shoe, state.phase === "flop" ? 3 : 1));
  state.currentBet = 0;
  state.minRaise = 20;
  for (const player of state.players) { player.bet = 0; player.acted = false; }
  state.message = `${state.phase.toUpperCase()}: the board has been dealt.`;
  if (active(state).every((player) => player.stack === 0)) { advance(state, effect, state.button); return; }
  setTurn(state, state.button);
}

function startHand(state: PokerState, effect: Effect): void {
  const eligible = state.players.filter((player) => player.stack > 0);
  if (eligible.length < 2) throw new Error("At least two players with chips are required.");
  if (state.mode === "tournament" && state.started) throw new Error("The tournament has already started.");
  state.started = true;
  state.hand++;
  state.phase = "preflop";
  state.board = [];
  state.shoe = deck();
  state.pot = 0;
  state.currentBet = 0;
  state.minRaise = 20;
  state.button = nextSeat(state, state.button, (player) => player.stack > 0);
  for (const player of state.players) {
    player.bet = 0; player.contributed = 0; player.folded = player.stack === 0;
    player.acted = false; player.hole = player.stack > 0 ? take(state.shoe, state.game === "omaha" ? 4 : 2) : [];
    player.lastAction = "";
  }
  const headsUp = eligible.length === 2;
  const small = headsUp ? state.button : nextSeat(state, state.button, (player) => player.hole.length > 0);
  const big = nextSeat(state, small, (player) => player.hole.length > 0);
  putIn(state, state.players[small], 10);
  putIn(state, state.players[big], 20);
  state.currentBet = Math.max(state.players[small].bet, state.players[big].bet);
  state.message = `${state.players[small].name} posts 10; ${state.players[big].name} posts 20.`;
  if (active(state).every((player) => player.stack === 0)) advance(state, effect, big);
  else setTurn(state, big);
}

export function joinPoker(state: PokerState, userId: string, name: string): Effect {
  if (state.players.some((player) => player.id === userId)) throw new Error("Already seated.");
  if (state.players.length >= 6) throw new Error("This table is full.");
  if (state.mode === "tournament" && state.started) throw new Error("This tournament has started.");
  state.players.push({ id: userId, name, stack: buyIn, bet: 0, contributed: 0, folded: false, acted: false, hole: [], lastAction: "" });
  state.message = `${name} joined with ${buyIn} chips.`;
  return { transfers: [{ userId, chips: -buyIn }], results: [] };
}

export function actPoker(state: PokerState, userId: string, action: string, amount = 0): Effect {
  const effect = emptyEffect();
  const player = state.players.find((seat) => seat.id === userId);
  if (!player) throw new Error("Join the table first.");
  if (action === "start") {
    if (state.phase !== "waiting" && state.phase !== "finished") throw new Error("The table is busy.");
    startHand(state, effect);
    return effect;
  }
  if (action === "leave") {
    if (!["waiting", "finished", "complete"].includes(state.phase)) throw new Error("Finish the hand before leaving.");
    if (state.mode === "tournament" && state.started && state.phase !== "complete") throw new Error("Tournament players stay until it finishes.");
    if (state.mode === "cash" || !state.started) effect.transfers.push({ userId, chips: player.stack });
    state.players = state.players.filter((seat) => seat.id !== userId);
    if (state.button >= state.players.length) state.button = state.players.length - 1;
    state.message = `${player.name} left the table.`;
    return effect;
  }
  if (action === "rebuy") {
    if (state.mode !== "cash" || !["waiting", "finished"].includes(state.phase) || player.stack !== 0) throw new Error("Rebuy is only available after busting at a cash table.");
    player.stack = buyIn;
    effect.transfers.push({ userId, chips: -buyIn });
    return effect;
  }
  if (!["preflop", "flop", "turn", "river"].includes(state.phase) || state.turn !== userId) throw new Error("It is not your turn.");
  const index = state.players.indexOf(player);
  const call = state.currentBet - player.bet;
  if (action === "fold") { player.folded = true; player.acted = true; player.lastAction = "Fold"; }
  else if (action === "check") {
    if (call !== 0) throw new Error("You must call, raise, or fold.");
    player.acted = true; player.lastAction = "Check";
  } else if (action === "call") {
    if (call <= 0) throw new Error("There is nothing to call.");
    putIn(state, player, call); player.acted = true; player.lastAction = player.stack ? "Call" : "All in";
  } else if (action === "raise") {
    const max = state.game === "omaha" ? Math.min(player.bet + player.stack, state.currentBet + state.pot + call) : player.bet + player.stack;
    if (!Number.isSafeInteger(amount) || amount <= state.currentBet || amount > max || (amount < state.currentBet + state.minRaise && amount !== player.bet + player.stack))
      throw new Error(`Raise total must be ${state.currentBet + state.minRaise}–${max}, or an all-in amount.`);
    const previous = state.currentBet;
    putIn(state, player, amount - player.bet);
    state.currentBet = player.bet;
    if (state.currentBet - previous >= state.minRaise) state.minRaise = state.currentBet - previous;
    for (const seat of state.players) if (seat.id !== userId && available(seat)) seat.acted = false;
    player.acted = true;
    player.lastAction = `Raise to ${player.bet}`;
  } else throw new Error("Unknown poker action.");
  state.message = `${player.name}: ${player.lastAction}.`;
  advance(state, effect, index);
  return effect;
}

export function viewPoker(state: PokerState, viewerId: string): PokerState {
  const copy = structuredClone(state);
  copy.shoe = [];
  if (state.phase !== "finished" && state.phase !== "complete") {
    for (const player of copy.players) if (player.id !== viewerId) player.hole = [];
  }
  return copy;
}
