"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const key = "dg-appearance";
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener("dg-appearance", callback);
  media.addEventListener("change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("dg-appearance", callback); media.removeEventListener("change", callback); };
}
function snapshot() {
  let choice = "system";
  try { const saved = localStorage.getItem(key); choice = saved === "light" || saved === "dark" ? saved : "system"; } catch { /* Storage may be unavailable. */ }
  return `${choice}:${matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"}`;
}
export function ThemeControl() {
  const preference = useSyncExternalStore(subscribe, snapshot, () => "system:light");
  const [fallback, setFallback] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = [{ value: "light", icon: "☀", label: "Day garden", detail: "Bright sky & clear acrylic" }, { value: "dark", icon: "☾", label: "Moonlit lagoon", detail: "Deep water & soft highlights" }, { value: "system", icon: "◐", label: "Follow system", detail: "Match your device appearance" }];
  const [saved] = preference.split(":");
  const choice = fallback || saved;
  useEffect(() => {
    // Read the current client preference to avoid undoing the pre-paint theme
    // while useSyncExternalStore is still reconciling its hydration snapshot.
    const [latest, os] = snapshot().split(":");
    const active = fallback || latest;
    document.documentElement.dataset.theme = active === "system" ? os : active;
  }, [preference, fallback]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    container.current?.querySelector<HTMLButtonElement>(`[data-choice="${choice}"]`)?.focus();
    return () => document.removeEventListener("pointerdown", close);
  }, [open, choice]);
  function select(value: string) {
    try { localStorage.setItem(key, value); } catch { setFallback(value); }
    window.dispatchEvent(new Event("dg-appearance"));
    setOpen(false); trigger.current?.focus();
  }
  const selected = options.find((option) => option.value === choice)!;
  return <div className="theme-control" ref={container} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (open && ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(container.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]") || []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowDown" ? 1 : 2)) % 3]?.focus();
    }
  }}><button ref={trigger} className="theme-trigger" aria-label={`Appearance: ${selected.label}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><span aria-hidden="true">{selected.icon}</span><span>Appearance</span><small aria-hidden="true">⌄</small></button>
    {open && <div className="theme-menu" role="menu" aria-label="Appearance">{options.map((option) => <button key={option.value} data-choice={option.value} role="menuitemradio" aria-checked={choice === option.value} onClick={() => select(option.value)}><i aria-hidden="true">{option.icon}</i><span><strong>{option.label}</strong><small>{option.detail}</small></span><b aria-hidden="true">{choice === option.value ? "✓" : ""}</b></button>)}</div>}
  </div>;
}
