import { randomInt } from "node:crypto";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { rank: number; suit: Suit };
export const suits: Suit[] = ["♠", "♥", "♦", "♣"];

export function deck(copies = 1, random = randomInt): Card[] {
  const cards: Card[] = [];
  for (let copy = 0; copy < copies; copy++) for (const suit of suits) for (let rank = 2; rank <= 14; rank++) cards.push({ rank, suit });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function label(card: Card): string {
  return `${({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[card.rank] || card.rank}${card.suit}`;
}

export function take(cards: Card[], count: number): Card[] {
  if (cards.length < count) throw new Error("The deck is empty.");
  return cards.splice(0, count);
}
