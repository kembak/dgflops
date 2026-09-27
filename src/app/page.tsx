"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { api, useApp } from "@/components/AppContext";

type RoomSummary = { id: string; game: string; mode: string; phase: string; players: number; maxPlayers: number };
const games = [
  { id: "ultimate", name: "Ultimate Hold'em", category: "TABLE GAME", symbol: "A♠", tone: "coral", description: "Face the dealer with your best five-card hand." },
  { id: "blackjack", name: "Blackjack", category: "TABLE GAME", symbol: "21", tone: "gold", description: "Draw to 21 with friends at the same table." },
  { id: "baccarat", name: "Baccarat", category: "TABLE GAME", symbol: "9", tone: "mint", description: "Back the player, banker, or a rare tie." },
  { id: "holdem", name: "Texas Hold'em", category: "POKER", symbol: "♠", tone: "rose", description: "No-limit poker, shared pots, real opponents." },
  { id: "omaha", name: "Pot-Limit Omaha", category: "POKER", symbol: "4", tone: "aqua", description: "Four hole cards and pot-limit action." },
] as const;
const names: Record<string, string> = Object.fromEntries(games.map((game) => [game.id, game.name]));

export default function Home() {
  const router = useRouter();
  const { user, ready, refresh, sound } = useApp();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selected, setSelected] = useState<(typeof games)[number] | null>(null);
  const [visibility, setVisibility] = useState("public");
  const [mode, setMode] = useState("cash");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() { try { const result = await api<{ rooms: RoomSummary[] }>("/api/rooms"); if (alive) setRooms(result.rooms); } catch { /* The action error will be shown when a room is opened. */ } }
    void load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  async function create() {
    if (!selected) return;
    if (!user) { setError("Sign in or continue as a guest first."); return; }
    if (user.guest && (visibility !== "solo" || selected.category === "POKER")) { setError("Guests can only play solo house games."); return; }
    setBusy(true); setError("");
    try {
      const result = await api<{ id: string }>("/api/rooms", { game: selected.id, mode, visibility });
      sound("chip"); await refresh(); router.push(`/room/${result.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create a room."); }
    finally { setBusy(false); }
  }

  async function joinPrivate(event: FormEvent) {
    event.preventDefault();
    if (!user || user.guest) { setError("Sign in to join a private table."); return; }
    setBusy(true); setError("");
    try { const result = await api<{ id: string }>("/api/rooms", { action: "joinCode", code: code.trim() }); router.push(`/room/${result.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Room not found."); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <SiteHeader />
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-content">
        <p className="eyebrow"><span className="status-light" />THE SOCIAL CASINO, REIMAGINED</p>
        <h1 id="hero-title">Play for <em>the moment.</em></h1>
        <p className="hero-copy">The thrill of the table. The company of friends. All the fun, none of the stakes.</p>
        <div className="hero-tags"><span>FUN-PLAY CHIPS</span><span>LIVE TABLES</span><span>YOUR CREW</span></div>
        <a className="hero-cta" href="#games">Find your table <span aria-hidden="true">↗</span></a>
      </div>
      <div className="hero-object" aria-hidden="true"><div className="orb-face">DG</div></div>
    </section>

    <section className="games" id="games" aria-labelledby="games-title">
      <div className="section-heading"><div><p className="eyebrow">FIND YOUR TABLE</p><h2 id="games-title">The lineup</h2></div><p>Five games. Real friends. Your kind of night.</p></div>
      <div className="game-grid">
        {games.map((game, index) => <button className={`game-tile ${game.tone}`} key={game.id} onClick={() => { setSelected(game); setVisibility(user?.guest ? "solo" : "public"); setError(""); }}>
          <span className="tile-top"><span>{String(index + 1).padStart(2, "0")} / {game.category}</span><span>✳</span></span>
          <span className="tile-symbol" aria-hidden="true">{game.symbol}</span>
          <span className="tile-bottom"><span><strong>{game.name}</strong><small>{game.description}</small></span><span className="tile-arrow">↗</span></span>
        </button>)}
      </div>
    </section>

    <section className="lobby-lower">
      <div className="panel"><div className="panel-heading"><div><p className="eyebrow">THE LOBBY</p><h2>Open tables</h2></div><span className="live-dot">● LIVE</span></div>
        {rooms.length ? <div className="room-list">{rooms.map((room) => <Link href={`/room/${room.id}`} className="room-list-item" key={room.id}>
          <span><strong>{names[room.game] || room.game}</strong><small>{room.mode === "house" ? "House table" : room.mode === "cash" ? "Chip table" : "Sit-and-go tournament"}</small></span>
          <span>{room.players}/{room.maxPlayers} seated</span><span className="room-phase">{room.phase} ↗</span>
        </Link>)}</div> : <p className="empty-copy">No public tables yet. Pick a game above to open the first one.</p>}
      </div>
      <div className="panel invite-panel"><p className="eyebrow">YOUR PRIVATE TABLE</p><h2>Bring your crew.</h2><p>Share a room code with friends and meet at the table.</p>
        <form onSubmit={joinPrivate} className="join-form"><input aria-label="Room code" placeholder="ENTER ROOM CODE" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><button disabled={busy}>Join ↗</button></form>
        <Link href="/leaderboard" className="subtle-link">See the leaderboard →</Link>
      </div>
    </section>
    {error && !selected && <p className="form-error" role="alert">{error}</p>}
    <p className="closing"><span aria-hidden="true">✦</span> Good company. Great hands. Zero real-money stakes.</p>
    <footer><span>DG FLOPS © {new Date().getFullYear()}</span><span>JUST FOR FUN</span></footer>

    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section className="launch-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title">
        <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
        <p className="eyebrow">SET THE TABLE</p><h2 id="launch-title">{selected.name}</h2><p>{selected.description}</p>
        {selected.category === "POKER" && <label className="select-label">Format<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="cash">Chip table · 1,000 buy-in</option><option value="tournament">Single-table tournament · 1,000 buy-in</option></select></label>}
        <label className="select-label">Room<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Public table</option><option value="private">Private table · share a code</option>{selected.category === "TABLE GAME" && <option value="solo">Solo house table</option>}</select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!ready && <p>Checking your session…</p>}
        <button className="primary-button" disabled={busy || !ready} onClick={create}>{busy ? "Opening…" : "Open table ↗"}</button>
        <p className="fine-print">Chips are for entertainment only and have no cash value.</p>
      </section>
    </div>}
  </main>;
}
