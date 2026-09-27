import { deck, take, type Card } from "./cards";
import { baccaratPayout, baccaratRound, blackjackPayout, blackjackTotal, ultimatePayout, type BaccaratSide } from "./house";

export type HouseGame = "blackjack" | "baccarat" | "ultimate";
export type Seat = { id: string; name: string };
export type HouseBet = { amount: number; side?: BaccaratSide; play: number; folded: boolean; doubled: boolean };
export type Settlement = { userId: string; payout: number; wagered: number; net: number; note: string };
export type Effect = { transfers: { userId: string; chips: number }[]; results: Settlement[] };
export type HouseState = {
  kind: "house"; game: HouseGame; phase: "betting" | "playing" | "finished";
  seats: Seat[]; bets: Record<string, HouseBet>; hands: Record<string, Card[]>;
  dealer: Card[]; board: Card[]; shoe: Card[]; turn: string | null;
  stage: "preflop" | "flop" | "river" | null; acted: string[];
  result: string; round: number; deadline: number;
};

const emptyEffect = (): Effect => ({ transfers: [], results: [] });
const stake = (bet: HouseBet, game: HouseGame) => game === "ultimate" ? bet.amount * 2 + bet.play : bet.amount * (bet.doubled ? 2 : 1);

export function newHouseState(game: HouseGame): HouseState {
  return { kind: "house", game, phase: "betting", seats: [], bets: {}, hands: {}, dealer: [], board: [], shoe: [], turn: null, stage: null, acted: [], result: "Place a wager to begin.", round: 0, deadline: 0 };
}

function active(state: HouseState): string[] { return state.seats.map((seat) => seat.id).filter((id) => !!state.bets[id]); }
function nextBlackjack(state: HouseState, after = ""): void {
  const ids = active(state);
  const start = Math.max(0, ids.indexOf(after) + 1);
  state.turn = ids.slice(start).find((id) => blackjackTotal(state.hands[id]).total < 21) || null;
  if (state.turn) { state.deadline = Date.now() + 60000; return; }
  while (blackjackTotal(state.dealer).total < 17) state.dealer.push(take(state.shoe, 1)[0]);
  state.phase = "finished";
}

function finish(state: HouseState, effect: Effect): void {
  state.phase = "finished";
  state.turn = null;
  for (const id of active(state)) {
    const bet = state.bets[id];
    let payout = 0;
    let detail = "";
    if (state.game === "blackjack") {
      payout = blackjackPayout(state.hands[id], state.dealer, bet.amount, bet.doubled);
      detail = `${blackjackTotal(state.hands[id]).total} vs dealer ${blackjackTotal(state.dealer).total}`;
    } else if (state.game === "baccarat") {
      const winner = state.result as BaccaratSide;
      payout = baccaratPayout(bet.side || "player", winner, bet.amount);
      detail = `${bet.side} bet, ${winner} won`;
    } else {
      const outcome = ultimatePayout(state.hands[id], state.dealer, state.board, bet.amount, bet.play, bet.folded);
      payout = outcome.payout;
      detail = `${outcome.result}: ${outcome.hand}`;
    }
    const wagered = stake(bet, state.game);
    effect.transfers.push({ userId: id, chips: payout });
    effect.results.push({ userId: id, payout, wagered, net: payout - wagered, note: `${state.game}: ${detail}` });
  }
  state.result = effect.results.map((item) => `${state.seats.find((seat) => seat.id === item.userId)?.name}: ${item.net >= 0 ? "+" : ""}${item.net}`).join(" · ");
}

function advanceUltimate(state: HouseState, effect: Effect): void {
  const pending = active(state).filter((id) => state.bets[id].play === 0 && !state.bets[id].folded);
  const next = pending.find((id) => !state.acted.includes(id));
  if (next) { state.turn = next; state.deadline = Date.now() + 60000; return; }
  state.acted = [];
  if (state.stage === "preflop") state.stage = "flop";
  else if (state.stage === "flop") state.stage = "river";
  else { finish(state, effect); return; }
  advanceUltimate(state, effect);
}

export function actHouse(state: HouseState, userId: string, action: string, amount = 0, side?: BaccaratSide): Effect {
  const effect = emptyEffect();
  const seated = state.seats.some((seat) => seat.id === userId);
  if (!seated) throw new Error("Join the table first.");
  if (action === "bet") {
    if (state.phase !== "betting") throw new Error("Betting is closed.");
    if (state.bets[userId]) throw new Error("You already placed a bet.");
    if (!Number.isSafeInteger(amount) || amount < 10 || amount > 5000) throw new Error("Bet 10–5,000 chips.");
    if (state.game === "baccarat" && !["player", "banker", "tie"].includes(side || "")) throw new Error("Choose player, banker, or tie.");
    state.bets[userId] = { amount, side, play: 0, folded: false, doubled: false };
    effect.transfers.push({ userId, chips: -(state.game === "ultimate" ? amount * 2 : amount) });
    state.result = `${active(state).length} player(s) ready. Start the round when everyone has bet.`;
    return effect;
  }
  if (action === "start") {
    if (state.phase !== "betting" || active(state).length === 0) throw new Error("At least one bet is needed.");
    state.phase = "playing";
    state.round++;
    state.shoe = deck();
    state.hands = {};
    if (state.game === "baccarat") {
      const outcome = baccaratRound(state.shoe);
      state.hands.player = outcome.player;
      state.hands.banker = outcome.banker;
      state.result = outcome.winner;
      finish(state, effect);
    } else if (state.game === "blackjack") {
      for (const id of active(state)) state.hands[id] = take(state.shoe, 2);
      state.dealer = take(state.shoe, 2);
      nextBlackjack(state);
      if (!state.turn) finish(state, effect);
      else state.result = "Players take turns against the dealer.";
    } else {
      for (const id of active(state)) state.hands[id] = take(state.shoe, 2);
      state.dealer = take(state.shoe, 2);
      state.board = take(state.shoe, 5);
      state.stage = "preflop";
      state.acted = [];
      advanceUltimate(state, effect);
      state.result = "Choose when to make your play bet.";
    }
    return effect;
  }
  if (action === "next") {
    if (state.phase !== "finished") throw new Error("The round is still in progress.");
    const seats = state.seats;
    const round = state.round;
    Object.assign(state, newHouseState(state.game), { seats, round });
    return effect;
  }
  if (state.phase !== "playing" || state.turn !== userId) throw new Error("It is not your turn.");
  const bet = state.bets[userId];
  if (state.game === "blackjack") {
    if (action === "hit") {
      state.hands[userId].push(take(state.shoe, 1)[0]);
      if (blackjackTotal(state.hands[userId]).total >= 21) nextBlackjack(state, userId);
    } else if (action === "stand") nextBlackjack(state, userId);
    else if (action === "double") {
      if (state.hands[userId].length !== 2) throw new Error("Double is only available on your first two cards.");
      bet.doubled = true;
      effect.transfers.push({ userId, chips: -bet.amount });
      state.hands[userId].push(take(state.shoe, 1)[0]);
      nextBlackjack(state, userId);
    } else throw new Error("Unknown blackjack action.");
    if (!state.turn) finish(state, effect);
    return effect;
  }
  if (state.game === "ultimate") {
    if (action === "check" && state.stage !== "river") state.acted.push(userId);
    else if (action === "fold" && state.stage === "river") { bet.folded = true; state.acted.push(userId); }
    else if (action === "raise") {
      const multiplier = state.stage === "preflop" ? 4 : state.stage === "flop" ? 2 : 1;
      bet.play = bet.amount * multiplier;
      effect.transfers.push({ userId, chips: -bet.play });
      state.acted.push(userId);
    } else throw new Error("Invalid action for this stage.");
    advanceUltimate(state, effect);
    return effect;
  }
  throw new Error("This game has no turn action.");
}

export function viewHouse(state: HouseState, viewerId: string): HouseState {
  const copy = structuredClone(state);
  copy.shoe = [];
  if (state.game === "blackjack" && state.phase === "playing") copy.dealer = state.dealer.slice(0, 1);
  if (state.game === "ultimate") {
    for (const id of Object.keys(copy.hands)) if (id !== viewerId) copy.hands[id] = [];
    if (state.phase !== "finished") copy.dealer = [];
    if (state.stage === "preflop") copy.board = [];
    else if (state.stage === "flop") copy.board = copy.board.slice(0, 3);
  }
  return copy;
}
