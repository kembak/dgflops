import assert from "node:assert/strict";
import test from "node:test";
import { deck, type Card } from "../src/lib/games/cards";
import { baccaratPayout, baccaratRound, baccaratTotal, blackjackPayout, blackjackTotal, ultimatePayout } from "../src/lib/games/house";
import { actHouse, newHouseState, viewHouse } from "../src/lib/games/house-room";
import { actPoker, joinPoker, newPokerState, viewPoker, type PokerGame } from "../src/lib/games/poker-room";
import { bestHand, evaluateFive } from "../src/lib/games/poker";

const card = (rank: number, suit: Card["suit"] = "♠"): Card => ({ rank, suit });
const shoe = (...ranks: number[]) => [...ranks.map((rank, i) => card(rank, ["♠", "♥", "♦", "♣"][i % 4] as Card["suit"])), ...deck(6, () => 0)];
function house(game: "blackjack" | "baccarat" | "ultimate") {
  const state = newHouseState(game); state.seats = [{ id: "a", name: "Alice" }];
  actHouse(state, "a", "bet", 100, "player"); return state;
}
function poker(game: PokerGame = "holdem", mode: "cash" | "tournament" = "cash", count = 2) {
  const state = newPokerState(game, mode);
  for (let i = 0; i < count; i++) joinPoker(state, String(i), `Player ${i}`);
  return state;
}

test("secure shuffle supports deterministic random inputs and complete multi-deck shoes", () => {
  assert.equal(deck().length, 52); assert.equal(new Set(deck().map((c) => `${c.rank}${c.suit}`)).size, 52);
  assert.deepEqual(deck(1, () => 0), deck(1, () => 0)); assert.equal(deck(8).length, 416);
});
test("blackjack soft totals, naturals, double and push payouts", () => {
  assert.deepEqual(blackjackTotal([card(14), card(6)]), { total: 17, soft: true });
  assert.deepEqual(blackjackTotal([card(14), card(6), card(10)]), { total: 17, soft: false });
  assert.equal(blackjackPayout([card(14), card(10)], [card(10), card(9)], 100), 250);
  assert.equal(blackjackPayout([card(14), card(10)], [card(14), card(10)], 100), 100);
  assert.equal(blackjackPayout([card(10), card(9), card(2)], [card(14), card(10)], 100, true), 0);
  assert.equal(blackjackPayout([card(14), card(10)], [card(10), card(9)], 100, false, true), 200);
});
test("blackjack peeks dealer natural and prevents double after settlement", () => {
  const state = house("blackjack"); const effect = actHouse(state, "a", "start", 0, undefined, { now: 100, shoe: shoe(9, 8, 14, 10) });
  assert.equal(state.phase, "finished"); assert.equal(effect.results[0].net, -100);
  assert.throws(() => actHouse(state, "a", "double"), /turn/);
});
test("blackjack split persists multiple hands and independently settles them", () => {
  let state = house("blackjack"); actHouse(state, "a", "start", 0, undefined, { now: 100, shoe: shoe(8, 8, 10, 7, 10, 9) });
  assert.equal(viewHouse(state, "a").dealer.length, 1); assert.equal(viewHouse(state, "a").shoe.length, 0);
  assert.equal(actHouse(state, "a", "split").transfers[0].chips, -100);
  state = JSON.parse(JSON.stringify(state));
  actHouse(state, "a", "stand"); assert.equal(state.handIndex?.a, 1);
  const result = actHouse(state, "a", "stand"); assert.equal(result.results[0].wagered, 200); assert.equal(result.results[0].payout, 300);
  assert.throws(() => actHouse(state, "a", "start"), /bet/);
});
test("split aces receive one card each and no natural bonus", () => {
  const state = house("blackjack"); actHouse(state, "a", "start", 0, undefined, { shoe: shoe(14, 14, 10, 7, 10, 9) });
  const result = actHouse(state, "a", "split"); assert.equal(state.phase, "finished"); assert.equal(result.results[0].payout, 400);
});
test("house actions reject invalid wagers, duplicate bets, actions and wrong turns", () => {
  const state = newHouseState("blackjack"); state.seats = [{ id: "a", name: "A" }];
  for (const value of [NaN, Infinity, -1, 9, 5001, 10.1]) assert.throws(() => actHouse(state, "a", "bet", value));
  actHouse(state, "a", "bet", 100); assert.throws(() => actHouse(state, "a", "bet", 100));
  assert.throws(() => actHouse(state, "b", "start")); assert.throws(() => actHouse(state, "a", "hit"));
});
test("baccarat aces, alternating deal, naturals and commission", () => {
  assert.equal(baccaratTotal([card(14), card(9), card(13)]), 0);
  const natural = baccaratRound(shoe(14, 3, 8, 4)); assert.equal(natural.winner, "player"); assert.equal(natural.player.length, 2);
  assert.equal(baccaratPayout("banker", "banker", 100), 195); assert.equal(baccaratPayout("tie", "tie", 100), 900);
  assert.equal(baccaratPayout("player", "tie", 100), 100); assert.equal(baccaratPayout("banker", "player", 100), 0);
});
test("baccarat banker third-card matrix", () => {
  for (let banker = 0; banker <= 7; banker++) for (let third = 0; third <= 9; third++) {
    const outcome = baccaratRound(shoe(10, banker || 10, 10, 10, third || 10, 2));
    const draws = banker <= 2 || banker === 3 && third !== 8 || banker === 4 && third >= 2 && third <= 7 || banker === 5 && third >= 4 && third <= 7 || banker === 6 && third >= 6 && third <= 7;
    assert.equal(outcome.banker.length, draws ? 3 : 2, `banker ${banker}, third ${third}`);
  }
});
test("Ultimate allows 3x/4x preflop, 2x flop, 1x river and hides undealt board", () => {
  const state = house("ultimate"); actHouse(state, "a", "start", 0, undefined, { shoe: deck(1, () => 0), now: 100 });
  assert.equal(viewHouse(state, "a").board.length, 0); assert.equal(viewHouse(state, "other").hands.a.length, 0);
  actHouse(state, "a", "check"); assert.equal(viewHouse(state, "a").board.length, 3);
  actHouse(state, "a", "check"); assert.equal(viewHouse(state, "a").board.length, 5);
  const result = actHouse(state, "a", "fold"); assert.equal(result.results[0].net, -200);
  const pre = house("ultimate"); actHouse(pre, "a", "start", 0, undefined, { shoe: deck() });
  assert.equal(actHouse(pre, "a", "raise", 3).transfers[0].chips, -300);
});
test("Ultimate royal flush blind payout and shared-board push", () => {
  const royal = [10, 11, 12, 13, 14].map((rank) => card(rank));
  const result = ultimatePayout([card(14), card(13)], [card(2, "♥"), card(2, "♦")], [card(10), card(11), card(12), card(4, "♥"), card(6, "♦")], 100, 400);
  assert.equal(result.payout, 51100);
  assert.equal(ultimatePayout([card(2, "♥"), card(3, "♦")], [card(4, "♥"), card(5, "♦")], royal, 100, 400).payout, 600);
});
test("poker evaluator handles wheel, kickers and exactly two Omaha hole cards", () => {
  assert.equal(evaluateFive([14, 2, 3, 4, 5].map((rank) => card(rank))).kickers[0], 5);
  const board = [10, 11, 12, 13, 14].map((rank) => card(rank));
  assert.equal(bestHand([card(2, "♥"), card(3, "♦")], board).category, 8);
  assert.notEqual(bestHand([card(2, "♥"), card(3, "♦"), card(4, "♣"), card(5, "♥")], board, "omaha").category, 8);
});
for (const game of ["holdem", "omaha"] as const) test(`${game}: turn order, reconnect privacy, all-in runout and conservation`, () => {
  const state = poker(game); actPoker(state, "0", "start", 0, { shoe: deck(1, () => 0), now: 100 });
  assert.equal(state.turn, "0"); assert.equal(state.deadline, 60100);
  assert.equal(viewPoker(state, "0").players[1].hole.length, 0); assert.equal(viewPoker(state, "0").shoe.length, 0);
  assert.throws(() => actPoker(state, "1", "check")); assert.throws(() => actPoker(state, "0", "check"));
  let actions = 0;
  while (state.turn && actions++ < 60) {
    const player = state.players.find((p) => p.id === state.turn)!;
    actPoker(state, player.id, player.bet < state.currentBet ? "call" : "check", 0, { now: 100 });
  }
  assert.equal(state.phase, "finished"); assert.equal(state.board.length, 5);
  assert.equal(state.players.reduce((sum, p) => sum + p.stack, 0), 2000);
});
test("short all-in does not reopen an already acted player's raise rights", () => {
  const state = poker("holdem", "cash", 3); actPoker(state, "0", "start");
  actPoker(state, "0", "raise", 100); actPoker(state, "1", "call");
  state.players[2].stack = 130; // 20 posted + 130 behind = short raise to 150.
  actPoker(state, "2", "raise", 150);
  assert.equal(state.turn, "0"); assert.throws(() => actPoker(state, "0", "raise", 230), /reopen/);
  actPoker(state, "0", "call"); actPoker(state, "1", "call"); assert.equal(state.phase, "flop");
});
test("Omaha enforces pot-limit maximum and cash table rejects leaving mid-hand", () => {
  const state = poker("omaha"); actPoker(state, "0", "start");
  assert.throws(() => actPoker(state, "0", "raise", 61)); actPoker(state, "0", "raise", 60);
  assert.throws(() => actPoker(state, "0", "leave"));
});
test("one live stack against an all-in runs the board without meaningless check turns", () => {
  const state = poker(); state.players[0].stack = 20; actPoker(state, "0", "start");
  actPoker(state, "0", "call"); assert.equal(state.phase, "finished"); assert.equal(state.board.length, 5);
});
test("tournaments continue after the first hand and pay the prize only once", () => {
  const state = poker("holdem", "tournament"); actPoker(state, "0", "start"); actPoker(state, "0", "fold");
  assert.equal(state.phase, "finished"); actPoker(state, "0", "start"); assert.equal(state.hand, 2);
  assert.throws(() => joinPoker(state, "2", "late"));
  // A forced, legal final river fixture: player 0 wins all tournament chips.
  state.phase = "river"; state.board = [card(2), card(3, "♥"), card(7, "♦"), card(9, "♣"), card(11)];
  state.pot = 2000; state.currentBet = 1000; state.turn = "0";
  state.players.forEach((p, i) => { p.stack = 0; p.bet = 1000; p.contributed = 1000; p.folded = false; p.acted = true; p.hole = i ? [card(4, "♥"), card(5, "♦")] : [card(14, "♥"), card(14, "♦")]; });
  const result = actPoker(state, "0", "check");
  assert.equal(state.phase, "complete"); assert.equal(result.transfers[0].chips, 2000);
  assert.throws(() => actPoker(state, "0", "check")); assert.throws(() => actPoker(state, "0", "start"));
});
test("side pots pay eligible winners and conserve uneven contributions", () => {
  const state = poker("holdem", "cash", 3); state.started = true; state.phase = "river";
  state.board = [card(2), card(3, "♥"), card(7, "♦"), card(9, "♣"), card(11)];
  state.pot = 700; state.currentBet = 300; state.turn = "2";
  state.players.forEach((p, i) => { p.stack = 0; p.bet = i ? 300 : 100; p.contributed = p.bet; p.folded = false; p.acted = true; p.hole = [card(14 - i, "♥"), card(14 - i, "♦")]; });
  actPoker(state, "2", "check");
  assert.deepEqual(state.players.map((p) => p.stack), [300, 400, 0]);
});
test("cumulative short all-ins reopen action only when a full raise is faced", () => {
  const state = poker("holdem", "cash", 4); actPoker(state, "0", "start");
  actPoker(state, "3", "raise", 100); actPoker(state, "0", "call");
  state.players[1].stack = 140; actPoker(state, "1", "raise", 150);
  state.players[2].stack = 180; actPoker(state, "2", "raise", 200);
  assert.equal(state.turn, "3"); actPoker(state, "3", "raise", 280);
  assert.equal(state.currentBet, 280);
});
test("new blackjack rounds clear all split/result state", () => {
  const state = house("blackjack"); actHouse(state, "a", "start", 0, undefined, { shoe: shoe(14, 14, 10, 7, 10, 9) });
  actHouse(state, "a", "split"); actHouse(state, "a", "next");
  assert.deepEqual(state.blackjackHands, {}); assert.deepEqual(state.settlements, []); assert.deepEqual(state.handIndex, {});
});
test("folded and uncontested private cards stay hidden after settlement", () => {
  const state = poker(); actPoker(state, "0", "start"); actPoker(state, "0", "fold");
  assert.equal(viewPoker(state, "0").players[1].hole.length, 0);
  assert.equal(viewPoker(state, "1").players[0].hole.length, 0);
});
