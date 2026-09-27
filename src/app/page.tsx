"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, useApp } from "@/components/AppContext";
import { openAccount } from "@/components/SiteHeader";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, LoadingState } from "@/components/ui/PageElements";
import { GameArtwork } from "@/components/games/GameAssets";
import { GameCarousel } from "@/components/games/GameCarousel";
import { games, gameNames } from "@/lib/game-catalog";

type RoomSummary = { id: string; game: string; mode: string; phase: string; players: number; maxPlayers: number };

export default function Home() {
  const router = useRouter();
  const { user, ready, refresh, authenticate, sound } = useApp();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsReady, setRoomsReady] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [selected, setSelected] = useState<(typeof games)[number] | null>(null);
  const [visibility, setVisibility] = useState("public");
  const [mode, setMode] = useState("cash");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = games.filter((game) => (category === "all" || game.category === category) && `${game.name} ${game.detail}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    let alive = true;
    async function load() {
      try { const result = await api<{ rooms: RoomSummary[] }>("/api/rooms"); if (alive) { setRooms(result.rooms); setRoomsError(""); } }
      catch { if (alive) setRoomsError("The lobby couldn't connect. We'll try again shortly."); }
      finally { if (alive) setRoomsReady(true); }
    }
    void load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  async function create() {
    if (!selected || !user) return;
    if (user.guest && (visibility !== "solo" || selected.category === "POKER")) { setError("Guests can play solo house games. Sign in to join friends."); return; }
    setBusy(true); setError("");
    try {
      const result = await api<{ id: string }>("/api/rooms", { game: selected.id, mode, visibility });
      sound("confirm"); await refresh(); router.push(`/room/${result.id}`);
    } catch (cause) { sound("error"); setError(cause instanceof Error ? cause.message : "Could not create a room."); }
    finally { setBusy(false); }
  }

  async function joinPrivate(event: FormEvent) {
    event.preventDefault();
    if (!user || user.guest) { openAccount(); return; }
    setBusy(true); setError("");
    try { const result = await api<{ id: string }>("/api/rooms", { action: "joinCode", code: code.trim() }); sound("confirm"); router.push(`/room/${result.id}`); }
    catch (cause) { sound("error"); setError(cause instanceof Error ? cause.message : "Room not found."); }
    finally { setBusy(false); }
  }

  return <main id="main-content" className="lobby-page">
    <section className="hero" aria-labelledby="hero-title">
      <Image src="/images/aero-garden.webp" alt="" fill priority sizes="(max-width: 1440px) 100vw, 1440px" className="hero-landscape" />
      <div className="hero-content"><p className="eyebrow"><span className="status-light" /> WELCOME TO YOUR LITTLE ESCAPE</p>
        <h1 id="hero-title">Bare moro.<br /><span>Uten tap.</span></h1>
        <p className="hero-copy">Felleskap, entusiasme, fun-play. På DG Flops spiller vi <i>for the love of the game</i>.</p>
        <a className="primary-button hero-cta" href="#games" data-sound="navigate">Finn ditt spill <Icon name="arrow" /></a>
        <div className="hero-tags"><span><Icon name="chip" /> 10,000 daily chips</span><span><Icon name="users" /> Better with friends</span></div>
      </div>
      <span className="hero-corner-note"><Icon name="leaf" /> Ekte spill. Ingen ekte penger.</span>
    </section>

    <div className="welcome-strip"><span className="object-icon"><Icon name="wave" /></span><div><strong>{user ? `Nice to see you, ${user.username}.` : "Come on in. The water's lovely."}</strong><span>{user ? "Your next good hand is waiting." : "Pick a game, settle in, and make yourself at home."}</span></div><span className="status-badge"><i className="status-light" /> {rooms.length} open {rooms.length === 1 ? "table" : "tables"}</span></div>

    <section className="games" id="games" aria-labelledby="games-title">
      <div className="section-heading"><div><p className="eyebrow">NOE FOR ENHVER STEMNING</p><h2 id="games-title">Hvor skal vi spille i dag?</h2></div><label className="search-field"><Icon name="search" /><span className="sr-only">Search games</span><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Find your game…" /></label></div>
      <div className="game-toolbar"><div className="tabs" role="group" aria-label="Game category">{[["all", "All games"], ["TABLE GAME", "Table games"], ["POKER", "Poker with friends"]].map(([value, label]) => <button key={value} aria-pressed={category === value} className={category === value ? "active" : ""} onClick={() => setCategory(value)} data-sound="select">{label}</button>)}</div><span className="muted">{filtered.length} games to explore</span></div>
      <GameCarousel items={filtered} onLaunch={(game) => { setSelected(game); setVisibility(user?.guest ? "solo" : "public"); setError(""); }} />
      {!filtered.length && <div className="panel"><EmptyState icon="search" title="No games found"><p>Try a different name or explore all five games.</p><button className="secondary-button" onClick={() => { setQuery(""); setCategory("all"); }}>Show all games</button></EmptyState></div>}
    </section>

    <section className="lobby-lower">
      <div className="panel"><div className="panel-heading"><div><p className="eyebrow">THERE&apos;S A SEAT FOR YOU</p><h2>Meet at the table.</h2></div><span className="status-badge"><i className="status-light" /> Live</span></div>
        {!roomsReady ? <LoadingState label="Finding open tables…" /> : roomsError ? <p className="form-error" role="alert">{roomsError}</p> : rooms.length ? <div className="room-list">{rooms.map((room) => <Link href={`/room/${room.id}`} className="room-list-item" key={room.id} data-sound="navigate"><span className="room-game-icon"><Icon name="cards" /></span><span><strong>{gameNames[room.game] || room.game}</strong><small>{room.mode === "house" ? "House table" : room.mode === "cash" ? "Chip table" : "Sit-and-go tournament"}</small></span><span className="seat-count"><Icon name="users" /> {room.players}/{room.maxPlayers}</span><Icon name="arrow" /></Link>)}</div> : <EmptyState icon="users" title="Be the first to pull up a chair."><p>Choose a game above and open a table for friends.</p></EmptyState>}
      </div>
      <div className="panel invite-panel"><span className="invite-object" aria-hidden="true"><Icon name="chat" /></span><p className="eyebrow">A LITTLE SPACE FOR YOUR PEOPLE</p><h2>Your table.<br />Your company.</h2><p>Have an invite? Bring your room code and we&apos;ll save you a seat.</p>
        <form onSubmit={joinPrivate} className="join-form"><input aria-label="Room code" placeholder="ROOM CODE" maxLength={8} required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><button className="primary-button" disabled={busy}>Join <Icon name="arrow" /></button></form>
        {error && !selected && <p className="form-error" role="alert">{error}</p>}
        <Link href="/leaderboard" className="subtle-link" data-sound="navigate">See who&apos;s making waves <Icon name="arrow" /></Link>
      </div>
    </section>
    <section className="daily-banner"><span className="object-icon" data-accent="amber"><Icon name="chip" /></span><div><h3>Every day is a fresh start.</h3><p>10,000 chips at 00:00 UTC. Your achievements and XP stay with you.</p></div><Link href="/profile" className="secondary-button">My collection <Icon name="arrow" /></Link></section>

    {selected && <Dialog title={selected.name} eyebrow="MAKE YOURSELF COMFORTABLE" onClose={() => setSelected(null)}>
      <div className="launch-art"><GameArtwork game={selected.id} /></div><p>{selected.detail}</p>
      {!user ? <><p className="info-note">Sign in to save your progress and play with friends.</p><button className="primary-button full-width" onClick={() => { setSelected(null); openAccount(); }}>Sign in or create an account <Icon name="user" /></button>{selected.category === "TABLE GAME" && <button className="text-button" disabled={busy || !ready} onClick={async () => { setBusy(true); if (await authenticate("guest")) setVisibility("solo"); setBusy(false); }}>Try this game as a guest</button>}</> : <>
        {selected.category === "POKER" && <label className="select-label">Format<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="cash">Chip table · 1,000 buy-in</option><option value="tournament">Single-table tournament · 1,000 buy-in</option></select></label>}
        <label className="select-label">Room<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public" disabled={user.guest}>Public table</option><option value="private" disabled={user.guest}>Private table · share a code</option>{selected.category === "TABLE GAME" && <option value="solo">Solo house table</option>}</select></label>
        {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-width" disabled={busy || !ready || (user.guest && selected.category === "POKER")} onClick={create}>{busy ? "Opening your table…" : "Let's play"}<Icon name="arrow" /></button>
        {user.guest && selected.category === "POKER" && <p className="info-note">Poker needs an account and real opponents. Sign out of guest play to create your account.</p>}
      </>}<p className="fine-print">Fun-play chips only. No cash value.</p>
    </Dialog>}
  </main>;
}
