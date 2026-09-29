import { deck, take, type Card } from "./cards";
import { baccaratPayout, baccaratRound, blackjackPayout, blackjackTotal, ultimatePayout, type BaccaratSide } from "./house";

export type HouseGame = "blackjack" | "baccarat" | "ultimate";
export type Seat = { id: string; name: string };
export type HouseBet = { amount: number; side?: BaccaratSide; play: number; folded: boolean; doubled: boolean };
export type Settlement = { userId: string; payout: number; wagered: number; net: number; note: string };
export type Effect = { transfers: { userId: string; chips: number }[]; results: Settlement[] };
export type EngineInput = { now?: number; shoe?: Card[] };
export type BlackjackHand = { cards: Card[]; amount: number; doubled: boolean; split: boolean; done: boolean };
export type HouseState = {
  kind: "house"; game: HouseGame; phase: "betting" | "playing" | "finished";
  seats: Seat[]; bets: Record<string, HouseBet>; hands: Record<string, Card[]>;
  dealer: Card[]; board: Card[]; shoe: Card[]; turn: string | null;
  stage: "preflop" | "flop" | "river" | null; acted: string[];
  result: string; round: number; deadline: number;
  settlements?: Settlement[]; blackjackHands?: Record<string, BlackjackHand[]>; handIndex?: Record<string, number>;
};

const emptyEffect = (): Effect => ({ transfers: [], results: [] });
const stake = (bet: HouseBet, game: HouseGame) => game === "ultimate" ? bet.amount * 2 + bet.play : bet.amount * (bet.doubled ? 2 : 1);

export function newHouseState(game: HouseGame): HouseState {
  return { kind: "house", game, phase: "betting", seats: [], bets: {}, hands: {}, dealer: [], board: [], shoe: [], turn: null, stage: null, acted: [], result: "Place a wager to begin.", round: 0, deadline: 0, settlements: [], blackjackHands: {}, handIndex: {} };
}

function active(state: HouseState): string[] { return state.seats.map((seat) => seat.id).filter((id) => !!state.bets[id]); }
function nextBlackjack(state: HouseState, now: number, after = ""): void {
  const ids = active(state);
  const start = Math.max(0, ids.indexOf(after) + 1);
  state.turn = ids.slice(start).find((id) => blackjackTotal(state.hands[id]).total < 21) || null;
  if (state.turn) { state.deadline = now + 60000; return; }
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
      const hands = state.blackjackHands?.[id];
      payout = hands ? hands.reduce((sum, hand) => sum + blackjackPayout(hand.cards, state.dealer, hand.amount, hand.doubled, hand.split), 0) : blackjackPayout(state.hands[id], state.dealer, bet.amount, bet.doubled);
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
    const wagered = state.game === "blackjack" && state.blackjackHands?.[id] ? state.blackjackHands[id].reduce((sum, hand) => sum + hand.amount * (hand.doubled ? 2 : 1), 0) : stake(bet, state.game);
    effect.transfers.push({ userId: id, chips: payout });
    effect.results.push({ userId: id, payout, wagered, net: payout - wagered, note: `${state.game}: ${detail}` });
  }
  state.result = effect.results.map((item) => `${state.seats.find((seat) => seat.id === item.userId)?.name}: ${item.net >= 0 ? "+" : ""}${item.net}`).join(" · ");
  state.settlements = effect.results;
}

function advanceUltimate(state: HouseState, effect: Effect, now: number): void {
  const pending = active(state).filter((id) => state.bets[id].play === 0 && !state.bets[id].folded);
  const next = pending.find((id) => !state.acted.includes(id));
  if (next) { state.turn = next; state.deadline = now + 60000; return; }
  state.acted = [];
  if (state.stage === "preflop") state.stage = "flop";
  else if (state.stage === "flop") state.stage = "river";
  else { finish(state, effect); return; }
  advanceUltimate(state, effect, now);
}

export function actHouse(state: HouseState, userId: string, action: string, amount = 0, side?: BaccaratSide, input: EngineInput = {}): Effect {
  const now = input.now ?? Date.now();
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
    state.shoe = input.shoe ? structuredClone(input.shoe) : deck(state.game === "baccarat" ? 8 : state.game === "blackjack" ? 6 : 1);
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
      state.blackjackHands = Object.fromEntries(active(state).map((id) => [id, [{ cards: state.hands[id], amount: state.bets[id].amount, doubled: false, split: false, done: false }]]));
      state.handIndex = {};
      // Peek before allowing extra wagers against a dealer natural.
      if (blackjackTotal(state.dealer).total === 21) state.turn = null;
      else nextBlackjack(state, now);
      if (!state.turn) finish(state, effect);
      else state.result = "Players take turns against the dealer.";
    } else {
      for (const id of active(state)) state.hands[id] = take(state.shoe, 2);
      state.dealer = take(state.shoe, 2);
      state.board = take(state.shoe, 5);
      state.stage = "preflop";
      state.acted = [];
      advanceUltimate(state, effect, now);
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
    const hands = state.blackjackHands?.[userId];
    const handIndex = state.handIndex?.[userId] || 0;
    const hand = hands?.[handIndex];
    const advanceHand = () => {
      if (hand) hand.done = true;
      const next = hands?.findIndex((item, i) => i > handIndex && !item.done && blackjackTotal(item.cards).total < 21) ?? -1;
      if (next >= 0 && hands) { state.handIndex![userId] = next; state.hands[userId] = hands[next].cards; state.deadline = now + 60000; }
      else nextBlackjack(state, now, userId);
    };
    // JSON snapshots do not retain reference identity; synchronize the active hand explicitly.
    if (hand) state.hands[userId] = hand.cards;
    if (action === "hit") {
      state.hands[userId].push(take(state.shoe, 1)[0]);
      if (blackjackTotal(state.hands[userId]).total >= 21) advanceHand();
    } else if (action === "stand") advanceHand();
    else if (action === "split") {
      const value = (card: Card) => card.rank === 14 ? 11 : Math.min(card.rank, 10);
      if (!hand || !hands || hands.length >= 4 || hand.cards.length !== 2 || value(hand.cards[0]) !== value(hand.cards[1])) throw new Error("Split requires a pair and fewer than four hands.");
      const aces = hand.cards[0].rank === 14;
      const second = hand.cards.pop()!;
      hand.split = true;
      hand.cards.push(take(state.shoe, 1)[0]);
      hands.splice(handIndex + 1, 0, { cards: [second, take(state.shoe, 1)[0]], amount: bet.amount, doubled: false, split: true, done: aces });
      effect.transfers.push({ userId, chips: -bet.amount });
      if (aces || blackjackTotal(hand.cards).total === 21) advanceHand();
    }
    else if (action === "double") {
      if (state.hands[userId].length !== 2) throw new Error("Double is only available on your first two cards.");
      bet.doubled = true;
      if (hand) hand.doubled = true;
      effect.transfers.push({ userId, chips: -bet.amount });
      state.hands[userId].push(take(state.shoe, 1)[0]);
      advanceHand();
    } else throw new Error("Unknown blackjack action.");
    if (!state.turn) finish(state, effect);
    return effect;
  }
  if (state.game === "ultimate") {
    if (action === "check" && state.stage !== "river") state.acted.push(userId);
    else if (action === "fold" && state.stage === "river") { bet.folded = true; state.acted.push(userId); }
    else if (action === "raise") {
      if (state.stage === "preflop" && ![0, 3, 4].includes(amount)) throw new Error("Preflop play must be 3x or 4x ante.");
      const multiplier = state.stage === "preflop" ? amount === 3 ? 3 : 4 : state.stage === "flop" ? 2 : 1;
      bet.play = bet.amount * multiplier;
      effect.transfers.push({ userId, chips: -bet.play });
      state.acted.push(userId);
    } else throw new Error("Invalid action for this stage.");
    advanceUltimate(state, effect, now);
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
