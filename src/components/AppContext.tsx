"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { playEffect, setEffectsVolume, type EffectName } from "@/lib/audio";
import catalog from "@/lib/music-catalog.json";
import { AudioDock } from "./AudioDock";

export type User = { id: string; username: string; guest: boolean; chips: number; gamesPlayed: number; wins: number; role?: "player" | "admin" };
export type Progress = { xp: number; earned: { id: string; earned_at: string }[]; history: { kind: string; chips_delta: number; xp: number; note: string; created_at: string }[];
  catalog: { id: string; title: string; description: string; chips: number; xp: number }[] };
type Track = { id: string; src: string; scope: string; title: string; artist: string; image: string | null };
const tracks = catalog as Track[];
const zones = new Set(["blackjack", "baccarat", "ultimate", "holdem", "omaha"]);

type AppValue = {
  user: User | null; progress: Progress | null; ready: boolean; error: string;
  refresh: () => Promise<void>; authenticate: (action: string, username?: string, password?: string) => Promise<boolean>;
  music: boolean; effects: boolean; musicVolume: number; effectsVolume: number; playing: boolean;
  track: Track | null; audioZone: string; setAudioZone: (zone: string) => void;
  toggleMusic: () => void; resumeMusic: () => void; toggleEffects: () => void; setMusicVolume: (value: number) => void; setEffectsVolume: (value: number) => void;
  nextTrack: () => void; previousTrack: () => void; sound: (name: EffectName) => void;
};
const AppContext = createContext<AppValue | null>(null);

export async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(path, { method: body ? "POST" : "GET", headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}

function savedNumber(key: string, fallback: number): number {
  const saved = Number(localStorage.getItem(key));
  return localStorage.getItem(key) === null || !Number.isFinite(saved) ? fallback : Math.max(0, Math.min(1, saved));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [music, setMusicEnabled] = useState(true);
  const [effects, setEffectsEnabled] = useState(true);
  const [musicVolume, setMusicVolumeState] = useState(0.45);
  const [effectsVolumeState, setEffectsVolumeState] = useState(0.75);
  const [playing, setPlaying] = useState(false);
  const [roomZone, setRoomZone] = useState("lobby");
  const [track, setTrack] = useState<Track | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setAudioZone = useCallback((zone: string) => setRoomZone(zones.has(zone) ? zone : "lobby"), []);
  const audioZone = pathname.startsWith("/room/") && zones.has(roomZone) ? roomZone : "lobby";
  const playlist = useMemo(() => {
    const preferred = tracks.filter((item) => item.scope === "all" || item.scope === audioZone);
    return preferred.length ? preferred : tracks;
  }, [audioZone]);

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
      setMusicEnabled(localStorage.getItem("dg-music") !== "off");
      setEffectsEnabled(localStorage.getItem("dg-effects") !== "off");
      setMusicVolumeState(savedNumber("dg-music-volume", 0.45));
      setEffectsVolumeState(savedNumber("dg-effects-volume", 0.75));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { setEffectsVolume(effects ? effectsVolumeState : 0); }, [effects, effectsVolumeState]);

  const stopFade = useCallback(() => { if (fadeRef.current) clearInterval(fadeRef.current); fadeRef.current = null; }, []);
  const fadeTo = useCallback((target: number, done?: () => void) => {
    const element = audioRef.current;
    if (!element) return;
    stopFade();
    const start = element.volume;
    let step = 0;
    fadeRef.current = setInterval(() => {
      step++;
      element.volume = Math.max(0, Math.min(1, start + (target - start) * (step / 12)));
      if (step >= 12) { stopFade(); done?.(); }
    }, 30);
  }, [stopFade]);
  const attemptPlay = useCallback((force = false) => {
    const element = audioRef.current;
    if (!element || !track || (!music && !force)) return;
    void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [music, track]);

  useEffect(() => {
    if (playlist.length === 0 || (track && playlist.some((item) => item.id === track.id))) return;
    const timer = setTimeout(() => {
      if (track && audioRef.current && !audioRef.current.paused) fadeTo(0, () => setTrack(playlist[0]));
      else setTrack(playlist[0]);
    }, 0);
    return () => clearTimeout(timer);
  }, [playlist, track, fadeTo]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !track) return;
    if (!music) { fadeTo(0, () => { element.pause(); setPlaying(false); }); return; }
    if (element.paused) element.volume = 0;
    void element.play().then(() => { setPlaying(true); fadeTo(musicVolume); }).catch(() => setPlaying(false));
    return stopFade;
  // The stable audio element is intentionally retained while routes change.
  }, [track, music, musicVolume, fadeTo, stopFade]);

  useEffect(() => {
    function unlock() { if (music && audioRef.current?.paused && track) attemptPlay(); }
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => { document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); };
  }, [music, track, attemptPlay]);

  async function authenticate(action: string, username?: string, password?: string): Promise<boolean> {
    try {
      const result = await api<{ user: User | null; progress: Progress | null }>("/api/auth", { action, username, password });
      setUser(result.user); setProgress(result.progress); setError("");
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); return false; }
  }

  function selectTrack(direction: number, immediate = false) {
    if (!playlist.length) return;
    const current = playlist.findIndex((item) => item.id === track?.id);
    const next = playlist[(current + direction + playlist.length) % playlist.length];
    if (next.id === track?.id) { if (audioRef.current) audioRef.current.currentTime = 0; return; }
    if (immediate) setTrack(next);
    else fadeTo(0, () => setTrack(next));
  }

  return <AppContext.Provider value={{ user, progress, ready, error, refresh, authenticate, music, effects,
    musicVolume, effectsVolume: effectsVolumeState, playing, track, audioZone,
    setAudioZone,
    toggleMusic: () => { const next = !music; localStorage.setItem("dg-music", next ? "on" : "off"); setMusicEnabled(next); if (next) attemptPlay(true); },
    resumeMusic: () => { localStorage.setItem("dg-music", "on"); setMusicEnabled(true); attemptPlay(true); },
    toggleEffects: () => { const next = !effects; localStorage.setItem("dg-effects", next ? "on" : "off"); setEffectsEnabled(next); },
    setMusicVolume: (value) => { localStorage.setItem("dg-music-volume", String(value)); setMusicVolumeState(value); },
    setEffectsVolume: (value) => { localStorage.setItem("dg-effects-volume", String(value)); setEffectsVolumeState(value); },
    nextTrack: () => selectTrack(1), previousTrack: () => selectTrack(-1),
    sound: (name) => { if (effects) playEffect(name); } }}>
    {children}
    <audio ref={audioRef} src={track?.src} preload="metadata" loop={playlist.length === 1} onEnded={() => selectTrack(1, true)} aria-hidden="true" />
    <AudioDock />
  </AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is missing.");
  return value;
}
