import type { Card } from "./cards";

export type PokerHand = { category: number; name: string; kickers: number[]; score: number; cards: Card[] };
const names = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];

function straightHigh(ranks: number[]): number {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i++) if (unique[i] - unique[i + 4] === 4) return unique[i];
  return 0;
}

export function evaluateFive(cards: Card[]): PokerHand {
  if (cards.length !== 5) throw new Error("A poker hand needs five cards.");
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = [...new Set(ranks)].map((rank) => ({ rank, count: ranks.filter((value) => value === rank).length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = straightHigh(ranks);
  let category: number;
  let kickers: number[];
  if (flush && straight) { category = 8; kickers = [straight]; }
  else if (counts[0].count === 4) { category = 7; kickers = [counts[0].rank, counts[1].rank]; }
  else if (counts[0].count === 3 && counts[1].count === 2) { category = 6; kickers = [counts[0].rank, counts[1].rank]; }
  else if (flush) { category = 5; kickers = ranks; }
  else if (straight) { category = 4; kickers = [straight]; }
  else if (counts[0].count === 3) { category = 3; kickers = [counts[0].rank, ...counts.slice(1).map((item) => item.rank)]; }
  else if (counts[0].count === 2 && counts[1].count === 2) { category = 2; kickers = [Math.max(counts[0].rank, counts[1].rank), Math.min(counts[0].rank, counts[1].rank), counts[2].rank]; }
  else if (counts[0].count === 2) { category = 1; kickers = [counts[0].rank, ...counts.slice(1).map((item) => item.rank)]; }
  else { category = 0; kickers = ranks; }
  const padded = [...kickers, ...Array(5).fill(0)].slice(0, 5);
  const score = padded.reduce((value, rank) => value * 15 + rank, category);
  return { category, name: names[category], kickers, score, cards };
}

function choose<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  return [...choose(items.slice(1), count - 1).map((rest) => [items[0], ...rest]), ...choose(items.slice(1), count)];
}

export function bestHand(hole: Card[], board: Card[], game: "holdem" | "omaha" = "holdem"): PokerHand {
  if (game === "holdem" && hole.length !== 2) throw new Error("Hold'em needs two hole cards.");
  if (game === "omaha" && hole.length !== 4) throw new Error("Omaha needs four hole cards.");
  if (board.length < 3 || board.length > 5) throw new Error("The board needs three to five cards.");
  const hands = game === "omaha"
    ? choose(hole, 2).flatMap((pair) => choose(board, 3).map((trio) => [...pair, ...trio]))
    : choose([...hole, ...board], 5);
  return hands.map(evaluateFive).sort((a, b) => b.score - a.score)[0];
}
