"use client";

import { useState } from "react";
import { useApp } from "./AppContext";

export function AudioDock() {
  const { track, audioZone, music, effects, musicVolume, effectsVolume, playing,
    toggleMusic, resumeMusic, toggleEffects, setMusicVolume, setEffectsVolume, nextTrack, previousTrack } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return <aside className="audio-dock" aria-label="Site audio player">
    <div className="audio-track-art" style={track?.image ? { backgroundImage: `url(${track.image})` } : undefined} aria-hidden="true">{!track?.image ? "DG" : null}</div>
    <div className="audio-track-info"><strong title={track?.title}>{track?.title || "No music added"}</strong><small>{track ? `${track.artist} · ${audioZone}` : "Drop tracks in public/music"}</small></div>
    <div className="audio-player-actions">
      <button onClick={previousTrack} disabled={!track} aria-label="Previous track" title="Previous track">‹‹</button>
      <button onClick={music && !playing ? resumeMusic : toggleMusic} aria-label={music && playing ? "Pause music" : "Play music"} title={music && playing ? "Pause music" : "Play music"}>{music && playing ? "Ⅱ" : "▶"}</button>
      <button onClick={nextTrack} disabled={!track} aria-label="Next track" title="Next track">››</button>
    </div>
    <button className="audio-settings-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-label="Audio settings" title="Audio settings">☷</button>
    {settingsOpen && <div className="audio-settings" role="group" aria-label="Audio settings">
      <div className="audio-settings-heading"><strong>Audio settings</strong><button onClick={() => setSettingsOpen(false)} aria-label="Close audio settings">×</button></div>
      <label><span>Background music <button onClick={toggleMusic} aria-label={music ? "Turn music off" : "Turn music on"}>{music ? "On" : "Off"}</button></span>
        <input type="range" min="0" max="100" value={Math.round(musicVolume * 100)} onChange={(event) => setMusicVolume(Number(event.target.value) / 100)} aria-label="Background music volume" /></label>
      <label><span>Game / sound effects <button onClick={toggleEffects} aria-label={effects ? "Turn effects off" : "Turn effects on"}>{effects ? "On" : "Off"}</button></span>
        <input type="range" min="0" max="100" value={Math.round(effectsVolume * 100)} onChange={(event) => setEffectsVolume(Number(event.target.value) / 100)} aria-label="Game and sound effects volume" /></label>
      <p>Music starts after your first interaction if your browser blocks autoplay.</p>
    </div>}
  </aside>;
}
