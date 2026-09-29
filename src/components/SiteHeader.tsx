"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "./AppContext";
import { Dialog } from "./ui/Dialog";
import { Icon, type IconName } from "./ui/Icon";
import { Wordmark } from "./ui/Wordmark";
import { ThemeControl } from "./ui/ThemeControl";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "The lobby", icon: "home" },
  { href: "/leaderboard", label: "Leaderboard", icon: "trophy" },
  { href: "/profile", label: "My collection", icon: "leaf" },
];

export function openAccount() { window.dispatchEvent(new Event("dgflops:account")); }

export function SiteHeader() {
  const { user, authenticate, error, sound } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("dgflops:account", show);
    return () => window.removeEventListener("dgflops:account", show);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    if (await authenticate(mode, username, password)) { sound("confirm"); setOpen(false); setPassword(""); }
    else sound("error");
    setBusy(false);
  }

  async function guest() {
    setBusy(true);
    if (await authenticate("guest")) { sound("confirm"); setOpen(false); }
    setBusy(false);
  }

  return <>
    <header className="app-header">
      <Link className="brand" href="/" aria-label="DG Flops home" data-sound="navigate"><Wordmark /></Link>
      <nav className="main-nav" aria-label="Main navigation">{navigation.map((item) => <Link key={item.href} href={item.href} data-sound="navigate" aria-current={pathname === item.href ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>)}</nav>
      <div className="header-actions">
        <ThemeControl />
        {user?.role === "admin" && <Link className="text-button" href="/admin">Admin</Link>}
        {user && <span className="chip-pill" title="Fun-play chips"><Icon name="chip" /><strong>{user.chips.toLocaleString()}</strong><small>chips</small></span>}
        <button className="account-button" onClick={() => setOpen(true)} data-sound="select"><Icon name="user" /><span>{user ? user.username : "Sign in"}</span></button>
      </div>
    </header>
    {open && <Dialog title={user ? user.username : mode === "login" ? "Welcome back." : "Make yourself at home."} eyebrow={user ? "YOUR ACCOUNT" : "GOOD COMPANY STARTS HERE"} onClose={() => setOpen(false)}>
      {user ? <>
        <div className="account-summary"><span className="object-icon"><Icon name="user" /></span><div><strong>{user.guest ? "Guest explorer" : "Club member"}</strong><p>{user.chips.toLocaleString()} fun-play chips</p></div></div>
        <p>{user.guest ? "Enjoy solo house games. Create an account to save achievements and play with friends." : "A fresh 10,000 chips every day at 00:00 UTC. Your XP and achievements stay with you."}</p>
        <Link className="secondary-button" href="/profile" onClick={() => setOpen(false)}>View my collection <Icon name="arrow" /></Link>
        <button className="text-button" disabled={busy} onClick={async () => { setBusy(true); if (await authenticate("logout")) setOpen(false); setBusy(false); }}>Sign out</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </> : <>
        <p>{mode === "login" ? "Your table, your friends, your next great hand." : "One account for all five games, private tables, and a growing collection of achievements."}</p>
        <form onSubmit={submit} className="stack-form">
          <label>Username<input required minLength={3} maxLength={20} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your name at the table" /></label>
          <label>Password<input required minLength={8} maxLength={128} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}<Icon name="arrow" /></button>
        </form>
        <button className="text-button" data-sound="select" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New here? Create an account" : "Already a member? Sign in"}</button>
        <div className="dialog-divider"><span>JUST LOOKING AROUND?</span></div>
        <button className="secondary-button full-width" disabled={busy} onClick={guest}>Try solo play as a guest <Icon name="cards" /></button>
      </>}
    </Dialog>}
  </>;
}
