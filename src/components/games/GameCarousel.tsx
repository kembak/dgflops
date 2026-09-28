"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { games } from "@/lib/game-catalog";
import { CarouselTable } from "./CarouselTable";
import { Icon } from "../ui/Icon";
import { newWheelGesture, swipeStep, wheelStep } from "@/lib/carousel-input";

type Game = (typeof games)[number];
export function GameCarousel({ items, onLaunch }: { items: readonly Game[]; onLaunch: (game: Game) => void }) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id || "");
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);
  const suppressClickUntil = useRef(0);
  const objectButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const pendingFocus = useRef<string | null>(null);
  const selected = Math.max(0, items.findIndex((item) => item.id === selectedId));
  const current = items[selected];
  const itemIds = items.map((item) => item.id).join("|");
  function choose(index: number) { if (items.length) setSelectedId(items[(index + items.length) % items.length].id); }
  useLayoutEffect(() => {
    if (pendingFocus.current) { objectButtons.current[pendingFocus.current]?.focus({ preventScroll: true }); pendingFocus.current = null; }
  }, [selectedId]);
  useEffect(() => {
    const element = stage.current;
    const ids = itemIds ? itemIds.split("|") : [];
    if (!element || ids.length < 2) return;
    const gesture = newWheelGesture();
    function wheel(event: WheelEvent) {
      if (event.ctrlKey || !event.cancelable || (!event.deltaX && !event.deltaY)) return;
      event.preventDefault();
      const step = wheelStep(gesture, event.deltaX, event.deltaY, event.deltaMode, performance.now());
      if (step) setSelectedId((previous) => {
        const index = Math.max(0, ids.indexOf(previous));
        return ids[(index + step + ids.length) % ids.length];
      });
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  // Keep gesture momentum protection across selection and lobby polling renders.
  }, [itemIds]);
  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = drag.current;
    drag.current = null;
    stage.current?.style.removeProperty("--drag-x");
    stage.current?.removeAttribute("data-dragging");
    if (!start || start.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (start.moved) suppressClickUntil.current = performance.now() + 400;
    if (!cancelled) { const step = swipeStep(event.clientX - start.x, event.clientY - start.y); if (step) choose(selected + step); }
  }
  if (!current) return null;
  return <div className="game-carousel" role="region" aria-roledescription="carousel" aria-label="Explore games" onKeyDown={(event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = (event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : selected + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    if (next === selected) objectButtons.current[items[next].id]?.focus({ preventScroll: true });
    else { pendingFocus.current = items[next].id; choose(next); }
  }}>
    <div className="carousel-stage" ref={stage} aria-label="Game showcase; scroll, drag or use arrow keys" onPointerDown={(event) => {
      if (event.button !== 0 || !event.isPrimary || items.length < 2) return;
      drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
    }} onPointerMove={(event) => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!start.moved && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.25) { start.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
      if (start.moved) { event.currentTarget.dataset.dragging = "true"; event.currentTarget.style.setProperty("--drag-x", `${Math.max(-38, Math.min(38, dx * .22))}px`); }
    }} onPointerUp={(event) => finishDrag(event)} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => { if (drag.current) finishDrag(event, true); }}>
      <div className="carousel-waterline" aria-hidden="true" /><div className="showcase-atmosphere" aria-hidden="true" />
      {items.map((game, index) => {
        let distance = index - selected;
        if (distance > items.length / 2) distance -= items.length;
        if (distance < -items.length / 2) distance += items.length;
        return <button key={game.id} ref={(element) => { objectButtons.current[game.id] = element; }} className={`carousel-object ${index === selected ? "is-selected" : ""}`} data-distance={Math.abs(distance)} data-accent={game.accent} style={{ "--position": distance, "--distance": Math.abs(distance) } as CSSProperties} aria-label={`Select ${game.name}`} aria-pressed={index === selected} tabIndex={index === selected ? 0 : -1} onClick={() => { if (performance.now() >= suppressClickUntil.current) choose(index); }} data-sound="select">
          <span className="object-sculpture"><span className="sculpture-aura" /><CarouselTable game={game.id} /></span><span className="object-name">{game.name}</span>
        </button>;
      })}
    </div>
    <div className="carousel-console" data-accent={current.accent}>
      <button className="secondary-button carousel-step" disabled={items.length < 2} onClick={() => choose(selected - 1)} aria-label="Previous game">←</button>
      <div className="carousel-caption" aria-live="polite" aria-atomic="true"><span className="eyebrow">{selected + 1} / {items.length} · {current.category}</span><h3>{current.name}</h3><p>{current.description}</p></div>
      <button className="secondary-button carousel-step" disabled={items.length < 2} onClick={() => choose(selected + 1)} aria-label="Next game">→</button>
      <button className="primary-button carousel-launch" onClick={() => onLaunch(current)} data-sound="select" title={`Play ${current.name}`}><span>Play {current.name}</span><Icon name="arrow" /></button>
    </div>
    <div className="carousel-selectors" role="group" aria-label="Choose a game">{items.map((game, index) => <button key={game.id} data-accent={game.accent} aria-pressed={selected === index} onClick={() => choose(index)} data-sound="select"><i aria-hidden="true" />{game.name}</button>)}</div>
    <p className="carousel-hint">Scroll or drag the showcase · Use ← → or Home / End · Select a game to explore</p>
  </div>;
}
