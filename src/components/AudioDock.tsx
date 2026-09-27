"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "./AppContext";

function MediaGlyph({ kind }: { kind: "previous" | "next" | "play" | "pause" }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{kind === "play" ? <path d="M7 4 20 12 7 20Z" /> : kind === "pause" ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <g transform={kind === "previous" ? "translate(24 0) scale(-1 1)" : undefined}><path d="m4 5 11 7-11 7zM17 5h3v14h-3z" /></g>}</svg>;
}

/** Both presentations are views of AppProvider. No playback state lives here. */
function MusicControls() {
  const { track, music, playing, previousTrack, nextTrack, resumeMusic, toggleMusic } = useApp();
  return <div className="audio-player-actions">
    <button onClick={previousTrack} disabled={!track} aria-label="Previous track" title="Previous track"><MediaGlyph kind="previous" /></button>
    <button className="audio-play-key" disabled={!track} onClick={music && !playing ? resumeMusic : toggleMusic} aria-label={music && playing ? "Pause music" : "Play music"} title={music && playing ? "Pause music" : "Play music"}><MediaGlyph kind={music && playing ? "pause" : "play"} /></button>
    <button onClick={nextTrack} disabled={!track} aria-label="Next track" title="Next track"><MediaGlyph kind="next" /></button>
  </div>;
}
function TrackDisplay() {
  const { track, audioZone } = useApp();
  return <><div className="audio-track-art" style={track?.image ? { backgroundImage: `url(${track.image})` } : undefined} aria-hidden="true">{!track?.image ? "dg" : null}</div><div className="audio-track-info"><strong title={track?.title}>{track?.title || "No music added"}</strong><small>{track ? `${track.artist} · ${audioZone}` : "Drop tracks in public/music"}</small></div></>;
}
function AudioSettings({ onClose }: { onClose: () => void }) {
  const { music, effects, musicVolume, effectsVolume, toggleMusic, toggleEffects, setMusicVolume, setEffectsVolume } = useApp();
  return <div className="audio-settings" role="group" aria-label="Audio settings" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <div className="audio-settings-heading"><strong>Make it sound like you.</strong><button onClick={onClose} aria-label="Close audio settings">×</button></div>
    <div className="audio-volume"><div><span>Background music</span><button onClick={toggleMusic} aria-label={music ? "Turn music off" : "Turn music on"}>{music ? "On" : "Off"}</button></div><label>Music volume · {Math.round(musicVolume * 100)}%<input type="range" min="0" max="100" value={Math.round(musicVolume * 100)} onChange={(event) => setMusicVolume(Number(event.target.value) / 100)} /></label></div>
    <div className="audio-volume"><div><span>Game / sound effects</span><button onClick={toggleEffects} aria-label={effects ? "Turn effects off" : "Turn effects on"}>{effects ? "On" : "Off"}</button></div><label>Effects volume · {Math.round(effectsVolume * 100)}%<input type="range" min="0" max="100" value={Math.round(effectsVolume * 100)} onChange={(event) => setEffectsVolume(Number(event.target.value) / 100)} /></label></div>
    <p>Music starts after your first interaction if your browser blocks autoplay.</p>
  </div>;
}
function SettingsButton() {
  const [open, setOpen] = useState(false);
  return <div className="audio-settings-anchor"><button className="audio-settings-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Audio settings" title="Audio settings">☷</button>{open && <AudioSettings onClose={() => setOpen(false)} />}</div>;
}

export function MusicBar() {
  return <aside className="music-bar" aria-label="Top music player"><span className="music-station">FLOPS FM <i aria-hidden="true" /></span><TrackDisplay /><MusicControls /><SettingsButton /></aside>;
}

const collapseKey = "dg-player-collapsed";
function subscribe(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener(collapseKey, callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener(collapseKey, callback); }; }
function getCollapse() { try { return localStorage.getItem(collapseKey) || "auto"; } catch { return "auto"; } }
export function AudioDock() {
  const preference = useSyncExternalStore(subscribe, getCollapse, () => "auto");
  const [fallback, setFallback] = useState<string | null>(null);
  const inRoom = usePathname().startsWith("/room/");
  const collapsed = (fallback || preference) === "yes" || ((fallback || preference) === "auto" && inRoom);
  useEffect(() => { document.documentElement.dataset.player = collapsed ? "collapsed" : "expanded"; }, [collapsed]);
  function collapse(value: boolean) {
    const saved = value ? "yes" : "no";
    try { localStorage.setItem(collapseKey, saved); } catch { setFallback(saved); }
    window.dispatchEvent(new Event(collapseKey));
  }
  if (collapsed) return <button className="audio-restore" aria-label="Restore floating music player" onClick={() => collapse(false)}>♫ <span>Flops FM</span><span aria-hidden="true">↗</span></button>;
  return <aside className="audio-dock" aria-label="Floating music player"><div className="audio-dock-caption"><span>FLOPS FM / POCKET RECEIVER</span><button onClick={() => collapse(true)} aria-label="Hide floating music player" title="Hide player">⌄</button></div><div className="audio-dock-body"><TrackDisplay /><MusicControls /><SettingsButton /></div></aside>;
}
