"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useApp } from "./AppContext";

export function SiteHeader() {
  const { user, authenticate, error, music, effects, toggleMusic, toggleEffects } = useApp();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    if (await authenticate(mode, username, password)) { setOpen(false); setPassword(""); }
    setBusy(false);
  }

  return <>
    <header className="app-header">
      <Link className="brand" href="/"><span className="brand-mark">DG</span><span>FLOPS<span className="brand-dot">.</span></span></Link>
      <nav className="main-nav" aria-label="Main navigation"><Link href="/">Lobby</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/profile">Achievements</Link></nav>
      <div className="header-actions">
        <button className="icon-button" onClick={toggleMusic} aria-label={music ? "Mute music" : "Play music"} title="Lobby music">{music ? "♫ On" : "♫ Off"}</button>
        <button className="icon-button" onClick={toggleEffects} aria-label={effects ? "Mute effects" : "Enable effects"} title="Sound effects">{effects ? "♪ On" : "♪ Off"}</button>
        {user ? <span className="chip-pill">◈ {user.chips.toLocaleString()}</span> : null}
        <button className="account-button" onClick={() => setOpen(true)}>{user ? user.username : "Sign in"}</button>
      </div>
    </header>
    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        {user ? <>
          <p className="eyebrow">YOUR ACCOUNT</p><h2 id="auth-title">{user.username}</h2>
          <p>{user.guest ? "Guest play is solo only. Create an account to join friends and earn achievements." : "Your chips reset to 10,000 at 00:00 UTC. Your XP and achievements stay."}</p>
          <button className="primary-button" onClick={async () => { await authenticate("logout"); setOpen(false); }}>Sign out</button>
        </> : <>
          <p className="eyebrow">WELCOME TO THE TABLE</p><h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <form onSubmit={submit} className="stack-form">
            <label>Username<input required minLength={3} maxLength={20} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
            <label>Password<input required minLength={8} maxLength={128} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy}>{mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <button className="text-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
          <button className="text-button" onClick={async () => { if (await authenticate("guest")) setOpen(false); }}>Continue as guest for solo play</button>
        </>}
      </section>
    </div>}
  </>;
}
