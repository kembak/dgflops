"use client";

import { useRef, useState, type CSSProperties } from "react";
import { games } from "@/lib/game-catalog";
import { GameArtwork } from "./GameAssets";
import { Icon } from "../ui/Icon";

type Game = (typeof games)[number];
export function GameCarousel({ items, onLaunch }: { items: readonly Game[]; onLaunch: (game: Game) => void }) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id || "");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const objectButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const selected = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const current = items[selected];
  function choose(index: number) { setSelectedId(items[(index + items.length) % items.length].id); }
  if (!current) return null;
  return <div className="game-carousel" role="region" aria-roledescription="carousel" aria-label="Explore games" onKeyDown={(event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = (event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : selected + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    choose(next);
    objectButtons.current[items[next].id]?.focus({ preventScroll: true });
  }}>
    <div className="carousel-stage" onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={(event) => {
      const start = touchStart.current; touchStart.current = null;
      if (!start) return;
      const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { suppressClickUntil.current = performance.now() + 400; choose(selected + (dx < 0 ? 1 : -1)); }
    }} onTouchCancel={() => { touchStart.current = null; }}>
      <div className="carousel-waterline" aria-hidden="true" />
      {items.map((game, index) => {
        let distance = index - selected;
        if (distance > items.length / 2) distance -= items.length;
        if (distance < -items.length / 2) distance += items.length;
        return <button key={game.id} ref={(element) => { objectButtons.current[game.id] = element; }} className={`carousel-object ${index === selected ? "is-selected" : ""}`} data-accent={game.accent} style={{ "--position": distance, "--distance": Math.abs(distance) } as CSSProperties} aria-label={`Select ${game.name}`} aria-pressed={index === selected} tabIndex={index === selected ? 0 : -1} onClick={() => { if (performance.now() >= suppressClickUntil.current) choose(index); }} data-sound="select">
          <span className="object-capsule"><GameArtwork game={game.id} /><span className="object-etching">{game.tag}</span></span><span className="object-name">{game.name}</span>
        </button>;
      })}
    </div>
    <div className="carousel-console" data-accent={current.accent}>
      <button className="secondary-button carousel-step" disabled={items.length < 2} onClick={() => choose(selected - 1)} aria-label="Previous game">←</button>
      <div className="carousel-caption" aria-live="polite" aria-atomic="true"><span className="eyebrow">{selected + 1} / {items.length} · {current.category}</span><h3>{current.name}</h3><p>{current.description}</p></div>
      <button className="secondary-button carousel-step" disabled={items.length < 2} onClick={() => choose(selected + 1)} aria-label="Next game">→</button>
      <button className="primary-button carousel-launch" onClick={() => onLaunch(current)} data-sound="select">Play {current.name}<Icon name="arrow" /></button>
    </div>
    <div className="carousel-selectors" role="group" aria-label="Choose a game">{items.map((game, index) => <button key={game.id} data-accent={game.accent} aria-pressed={selected === index} onClick={() => choose(index)} data-sound="select"><i aria-hidden="true" />{game.name}</button>)}</div>
    <p className="carousel-hint">Swipe, select a game, or use the arrow keys to explore.</p>
  </div>;
}
