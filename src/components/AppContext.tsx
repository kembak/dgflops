"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { playEffect, setMusic } from "@/lib/audio";

export type User = { id: string; username: string; guest: boolean; chips: number; gamesPlayed: number; wins: number };
export type Progress = { xp: number; earned: { id: string; earned_at: string }[]; history: { kind: string; chips_delta: number; xp: number; note: string; created_at: string }[];
  catalog: { id: string; title: string; description: string; chips: number; xp: number }[] };
type AppValue = {
  user: User | null; progress: Progress | null; ready: boolean; error: string;
  refresh: () => Promise<void>; authenticate: (action: string, username?: string, password?: string) => Promise<boolean>;
  music: boolean; effects: boolean; toggleMusic: () => void; toggleEffects: () => void; sound: (name: "card" | "chip" | "win" | "lose") => void;
};
const AppContext = createContext<AppValue | null>(null);

export async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(path, { method: body ? "POST" : "GET", headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [music, setMusicEnabled] = useState(false);
  const [effects, setEffectsEnabled] = useState(true);

  async function refresh() {
    try {
      const result = await api<{ user: User | null; progress: Progress | null }>("/api/auth");
      setUser(result.user); setProgress(result.progress); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed."); }
    finally { setReady(true); }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
      setMusicEnabled(localStorage.getItem("dg-music") === "on");
      setEffectsEnabled(localStorage.getItem("dg-effects") !== "off");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { setMusic(music); return () => setMusic(false); }, [music]);

  async function authenticate(action: string, username?: string, password?: string): Promise<boolean> {
    try {
      const result = await api<{ user: User | null; progress: Progress | null }>("/api/auth", { action, username, password });
      setUser(result.user); setProgress(result.progress); setError("");
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); return false; }
  }

  return <AppContext.Provider value={{ user, progress, ready, error, refresh, authenticate, music, effects,
    toggleMusic: () => { const next = !music; localStorage.setItem("dg-music", next ? "on" : "off"); setMusicEnabled(next); },
    toggleEffects: () => { const next = !effects; localStorage.setItem("dg-effects", next ? "on" : "off"); setEffectsEnabled(next); },
    sound: (name) => { if (effects) playEffect(name); } }}>
    {children}
  </AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is missing.");
  return value;
}
