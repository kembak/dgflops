"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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
  const [saved, system] = preference.split(":");
  const choice = fallback || saved;
  useEffect(() => {
    // Read the current client preference to avoid undoing the pre-paint theme
    // while useSyncExternalStore is still reconciling its hydration snapshot.
    const [latest, os] = snapshot().split(":");
    const active = fallback || latest;
    document.documentElement.dataset.theme = active === "system" ? os : active;
  }, [preference, fallback]);
  return <label className="theme-control"><span className="sr-only">Appearance</span><select aria-label="Appearance" value={choice} onChange={(event) => {
    const value = event.target.value;
    document.documentElement.dataset.theme = value === "system" ? system : value;
    try { localStorage.setItem(key, value); } catch { setFallback(value); }
    window.dispatchEvent(new Event("dg-appearance"));
  }}><option value="system">◐ Auto</option><option value="light">☀ Day</option><option value="dark">☾ Night</option></select></label>;
}
