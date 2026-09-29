"use client";

import { useRef, type CSSProperties } from "react";
import { useTableMotion } from "./GameMotion";
import type { Card } from "@/lib/games/cards";
import { games, type GameId } from "@/lib/game-catalog";

const rankNames: Record<number, string> = { 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
const suitNames = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };
const rankLabel = (value: number) => ({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[value] || String(value);

export function PlayingCard({ card, index = 0, back = false }: { card?: Card; index?: number; back?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useTableMotion(ref, card ? `${card.rank}${card.suit}` : "back", "card", index, back);
  const red = card?.suit === "♥" || card?.suit === "♦";
  return <span ref={ref} className={`playing-card ${red ? "red-card" : ""} ${back ? "card-back" : ""}`} style={{ "--deal-index": index } as CSSProperties} role="img" aria-label={back ? "Face-down card" : card ? `${rankNames[card.rank] || card.rank} of ${suitNames[card.suit]}` : "Card"}>
    {back ? <span className="card-back-emblem" aria-hidden="true">♠<small>DG</small></span> : card && <span className="card-face" aria-hidden="true">
      <span className="card-index">{rankLabel(card.rank)}<small>{card.suit}</small></span>
      <span className={`card-pips ${card.rank >= 11 ? "card-pips-large" : ""}`}>{card.rank >= 11 ? <><b>{card.rank === 14 ? card.suit : rankLabel(card.rank)}</b>{card.rank !== 14 && <small>{card.suit}</small>}</> : Array.from({ length: card.rank }, (_, i) => <i key={i}>{card.suit}</i>)}</span>
      <span className="card-index card-index-bottom">{rankLabel(card.rank)}<small>{card.suit}</small></span>
    </span>}
  </span>;
}

export function CardRow({ cards, hidden = 0, slots = 0, round = 0, offset = 0 }: { cards: Card[]; hidden?: number; slots?: number; round?: number; offset?: number }) {
  const empty = Math.max(0, slots - cards.length - hidden);
  return <div className="card-row" data-card-count={cards.length + hidden + empty} style={{ "--card-count": Math.max(1, cards.length + hidden + empty) } as CSSProperties}>
    {Array.from({ length: cards.length + hidden }, (_, i) => <PlayingCard card={cards[i]} back={i >= cards.length} index={offset + i} key={`${round}-${i}`} />)}
    {Array.from({ length: empty }, (_, i) => <span className="card-slot" key={`slot-${i}`} aria-hidden="true"><span>♠</span></span>)}
  </div>;
}

export function ChipStack({ amount, tone = "amber", compact = false }: { amount: number; tone?: string; compact?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useTableMotion(ref, String(amount), "chip");
  return <span className={`chip-stack ${compact ? "chip-stack-compact" : ""}`} data-accent={tone}><span ref={ref} className="chip-stack-object" aria-hidden="true"><i /><i /><i><b>DG</b></i></span><strong>{amount.toLocaleString()}<small> chips</small></strong></span>;
}

export function GameArtwork({ game }: { game: GameId }) {
  const info = games.find((item) => item.id === game)!;
  return <span className={`game-art game-art-${game}`} data-accent={info.accent} aria-hidden="true">
    <span className="art-horizon" /><span className="art-orbit" />
    <span className="glass-orb"><span>{info.symbol}</span></span>
    <span className="art-card art-card-one"><PlayingCard card={{ rank: game === "baccarat" ? 9 : 14, suit: "♠" }} /></span>
    <span className="art-card art-card-two"><PlayingCard card={{ rank: game === "omaha" ? 12 : 13, suit: "♥" }} /></span>
    <span className="art-chip"><ChipStack amount={100} /></span>
    <span className="art-leaf art-leaf-one" /><span className="art-leaf art-leaf-two" />
    <span className="art-bubble art-bubble-one" /><span className="art-bubble art-bubble-two" />
  </span>;
}
