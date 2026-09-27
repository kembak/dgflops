import { deck, take, type Card } from "./cards";
import { bestHand } from "./poker";

export function blackjackTotal(cards: Card[]): { total: number; soft: boolean } {
  let total = cards.reduce((sum, card) => sum + (card.rank === 14 ? 1 : Math.min(card.rank, 10)), 0);
  const soft = cards.some((card) => card.rank === 14) && total + 10 <= 21;
  if (soft) total += 10;
  return { total, soft };
}

export function blackjackPayout(player: Card[], dealer: Card[], wager: number, doubled = false): number {
  const mine = blackjackTotal(player).total;
  const theirs = blackjackTotal(dealer).total;
  const stake = doubled ? wager * 2 : wager;
  const natural = player.length === 2 && mine === 21 && !doubled;
  const dealerNatural = dealer.length === 2 && theirs === 21;
  if (mine > 21) return 0;
  if (natural && !dealerNatural) return Math.floor(wager * 2.5);
  if (dealerNatural && !natural) return 0;
  if (mine === theirs || (natural && dealerNatural)) return stake;
  return theirs > 21 || mine > theirs ? stake * 2 : 0;
}

export type BaccaratSide = "player" | "banker" | "tie";
function point(card: Card): number { return card.rank >= 10 ? 0 : card.rank; }
export function baccaratTotal(cards: Card[]): number { return cards.reduce((sum, card) => sum + point(card), 0) % 10; }

export function baccaratRound(cards = deck()): { player: Card[]; banker: Card[]; winner: BaccaratSide } {
  const player = [take(cards, 1)[0], take(cards, 1)[0]];
  const banker = [take(cards, 1)[0], take(cards, 1)[0]];
  const p = baccaratTotal(player);
  const b = baccaratTotal(banker);
  if (p < 8 && b < 8) {
    let third: number | null = null;
    if (p <= 5) { const card = take(cards, 1)[0]; player.push(card); third = point(card); }
    const bankerDraws = third === null ? b <= 5 :
      b <= 2 || (b === 3 && third !== 8) || (b === 4 && third >= 2 && third <= 7) ||
      (b === 5 && third >= 4 && third <= 7) || (b === 6 && third >= 6 && third <= 7);
    if (bankerDraws) banker.push(take(cards, 1)[0]);
  }
  const finalPlayer = baccaratTotal(player);
  const finalBanker = baccaratTotal(banker);
  return { player, banker, winner: finalPlayer === finalBanker ? "tie" : finalPlayer > finalBanker ? "player" : "banker" };
}

export function baccaratPayout(side: BaccaratSide, winner: BaccaratSide, wager: number): number {
  if (winner === "tie" && side !== "tie") return wager;
  if (side !== winner) return 0;
  if (side === "tie") return wager * 9;
  if (side === "banker") return wager + Math.floor(wager * 0.95);
  return wager * 2;
}

export function ultimatePayout(playerHole: Card[], dealerHole: Card[], board: Card[], ante: number, play: number, folded = false) {
  const wager = ante * 2 + play;
  if (folded) return { payout: 0, result: "Fold", hand: "Fold" };
  const mine = bestHand(playerHole, board);
  const dealer = bestHand(dealerHole, board);
  if (mine.score === dealer.score) return { payout: wager, result: "Push", hand: mine.name };
  const dealerQualifies = dealer.category >= 1;
  if (mine.score < dealer.score) return { payout: dealerQualifies ? 0 : ante, result: "Loss", hand: mine.name };
  const blindOdds: Record<number, number> = { 4: 1, 5: 1.5, 6: 3, 7: 10, 8: mine.kickers[0] === 14 ? 500 : 50 };
  const blind = ante + Math.floor(ante * (blindOdds[mine.category] || 0));
  return { payout: play * 2 + (dealerQualifies ? ante * 2 : ante) + blind, result: "Win", hand: mine.name };
}
