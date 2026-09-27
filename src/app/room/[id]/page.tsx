"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { api, useApp } from "@/components/AppContext";
import type { Card } from "@/lib/games/cards";
import type { HouseState } from "@/lib/games/house-room";
import type { PokerState } from "@/lib/games/poker-room";

type Room = { id: string; code: string | null; game: string; mode: string; visibility: string; hostId: string; seated: boolean; version: number;
  state: HouseState | PokerState; messages: { id: string; body: string; createdAt: string; username: string }[] };
const names: Record<string, string> = { blackjack: "Blackjack", baccarat: "Baccarat", ultimate: "Ultimate Hold'em", holdem: "Texas Hold'em", omaha: "Pot-Limit Omaha" };
const rank = (value: number) => ({ 11: "J", 12: "Q", 13: "K", 14: "A" } as Record<number, string>)[value] || value;

function Cards({ cards, hidden = 0 }: { cards: Card[]; hidden?: number }) {
  return <span className="card-row">{cards.map((card, index) => <span className={`playing-card ${card.suit === "♥" || card.suit === "♦" ? "red-card" : ""}`} key={`${card.suit}-${card.rank}-${index}`}>{rank(card.rank)}<small>{card.suit}</small></span>)}
    {Array.from({ length: hidden }, (_, index) => <span className="playing-card card-back" key={`hidden-${index}`}>DG</span>)}</span>;
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready, refresh, sound } = useApp();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bet, setBet] = useState(100);
  const [side, setSide] = useState("player");
  const [raise, setRaise] = useState(40);
  const [message, setMessage] = useState("");
  const tickBusy = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      try { const result = await api<Room>(`/api/rooms/${id}`); if (active) { setRoom(result); setError(""); } }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Could not load the table."); }
    }
    void load();
    const timer = setInterval(load, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [id, userId]);

  useEffect(() => {
    if (!room?.state.turn || room.state.deadline > Date.now() || tickBusy.current || !room.seated) return;
    tickBusy.current = true;
    void api<Room>(`/api/rooms/${id}`, { action: "tick" }).then(setRoom).catch(() => undefined).finally(() => { tickBusy.current = false; });
  }, [id, room]);

  async function action(name: string, extra: object = {}) {
    setBusy(true); setError("");
    try {
      const result = await api<Room>(`/api/rooms/${id}`, { action: name, ...extra });
      setRoom(result);
      if (["bet", "raise", "call", "double", "rebuy"].includes(name)) sound("chip");
      else if (["start", "hit", "next"].includes(name)) sound("card");
      if (result.state.phase === "finished" || result.state.phase === "complete") sound("win");
      await refresh();
      if (name === "leave") router.push("/");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed."); }
    finally { setBusy(false); }
  }

  async function chat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const body = message;
    setMessage("");
    await action("chat", { body });
  }

  return <main className="shell">
    <SiteHeader />
    <div className="table-breadcrumb"><Link href="/">← Lobby</Link><span>/</span><span>{room ? names[room.game] : "Loading table"}</span></div>
    {!ready || (user && !room && !error) ? <div className="panel table-loading">Preparing your table…</div> : !user ? <div className="panel table-loading">Sign in or continue as a guest from the top right to play.</div> : !room ? <div className="panel table-loading"><p className="form-error">{error}</p><Link href="/">Back to lobby</Link></div> : <>
      <div className="table-heading"><div><p className="eyebrow">{room.mode === "house" ? "HOUSE TABLE" : room.mode === "cash" ? "CHIP TABLE" : "SIT-AND-GO TOURNAMENT"}</p><h1>{names[room.game]}</h1></div>
        <div className="table-code">{room.visibility === "private" ? <>INVITE CODE <strong>{room.code}</strong><button onClick={() => { if (room.code) void navigator.clipboard.writeText(room.code); }}>Copy</button></> : <span>{room.visibility.toUpperCase()} TABLE</span>}</div></div>
      <div className="table-layout">
        <section className="table-main">
          <div className="felt-table">
            <div className="table-topline"><span>DG FLOPS · {room.state.kind === "house" ? `ROUND ${room.state.round}` : `HAND ${room.state.hand}`}</span><span>{room.state.phase.toUpperCase()}</span></div>
            {room.state.kind === "house" ? <HouseDisplay state={room.state} userId={user.id} /> : <PokerDisplay state={room.state} userId={user.id} />}
          </div>
          <div className="table-status" role="status">{room.state.kind === "house" ? room.state.result : room.state.message}</div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {!room.seated ? <button className="primary-button" disabled={busy || user.guest} onClick={() => void action("join")}>Join table {room.state.kind === "poker" ? "· 1,000 chips" : ""}</button>
            : room.state.kind === "house" ? <HouseControls state={room.state} userId={user.id} busy={busy} bet={bet} setBet={setBet} side={side} setSide={setSide} action={action} />
              : <PokerControls state={room.state} userId={user.id} busy={busy} raise={raise} setRaise={setRaise} action={action} />}
        </section>
        <aside className="table-sidebar">
          <div className="panel seats-panel"><p className="eyebrow">AT THE TABLE</p><h2>Players</h2>
            {(room.state.kind === "house" ? room.state.seats : room.state.players).map((player) => <div className="seat-line" key={player.id}><span className="seat-avatar">{player.name.slice(0, 1).toUpperCase()}</span><span>{player.name}{player.id === user.id ? " (you)" : ""}</span>{"stack" in player && typeof player.stack === "number" && <strong>{player.stack.toLocaleString()}</strong>}</div>)}
          </div>
          <div className="panel chat-panel"><p className="eyebrow">TABLE TALK</p><h2>Chat</h2>
            <div className="chat-messages" aria-live="polite">{room.messages.length ? room.messages.map((item) => <p key={item.id}><strong>{item.username}</strong> {item.body}</p>) : <p className="empty-copy">No messages yet. Say hello.</p>}</div>
            {room.seated && !user.guest ? <form className="chat-form" onSubmit={chat}><input aria-label="Chat message" maxLength={300} placeholder="Say something…" value={message} onChange={(event) => setMessage(event.target.value)} /><button disabled={busy}>Send</button></form> : <p className="fine-print">Accounts can chat at the table.</p>}
          </div>
          {room.seated && <button className="text-button leave-button" disabled={busy} onClick={() => void action("leave")}>Leave table</button>}
        </aside>
      </div>
      <p className="fine-print table-disclaimer">Fun-play chips have no monetary value. Turns expire after 60 seconds; timed-out players check when possible, otherwise fold or stand.</p>
    </>}
  </main>;
}

function HouseDisplay({ state, userId }: { state: HouseState; userId: string }) {
  if (state.game === "baccarat") return <div className="board-display"><div><span>PLAYER</span><Cards cards={state.hands.player || []} /></div><div><span>BANKER</span><Cards cards={state.hands.banker || []} /></div></div>;
  return <><div className="dealer-display"><span>DEALER</span><Cards cards={state.dealer} hidden={state.game === "blackjack" && state.phase === "playing" ? 1 : 0} /></div>
    {state.game === "ultimate" && <div className="community-cards"><span>BOARD {state.stage?.toUpperCase()}</span><Cards cards={state.board} /></div>}
    <div className="player-hands">{state.seats.filter((seat) => state.bets[seat.id]).map((seat) => <div className={`hand-line ${state.turn === seat.id ? "active-hand" : ""}`} key={seat.id}><span>{seat.name}{seat.id === userId ? " · YOU" : ""}</span><Cards cards={state.hands[seat.id] || []} hidden={state.game === "ultimate" && seat.id !== userId && state.phase !== "finished" ? 2 : 0} /><small>◈ {state.bets[seat.id].amount.toLocaleString()}</small></div>)}</div>
  </>;
}

function PokerDisplay({ state, userId }: { state: PokerState; userId: string }) {
  return <><div className="pot-display">POT <strong>◈ {state.pot.toLocaleString()}</strong></div><div className="community-cards"><Cards cards={state.board} hidden={state.phase !== "waiting" && state.phase !== "finished" && state.phase !== "complete" ? 5 - state.board.length : 0} /></div>
    <div className="player-hands">{state.players.map((player) => <div className={`hand-line ${state.turn === player.id ? "active-hand" : ""} ${player.folded ? "folded-hand" : ""}`} key={player.id}>
      <span>{player.name}{player.id === userId ? " · YOU" : ""}</span><Cards cards={player.hole} hidden={player.hole.length === 0 && state.started && !["waiting", "complete"].includes(state.phase) && !player.folded ? state.game === "omaha" ? 4 : 2 : 0} />
      <small>{player.lastAction || `◈ ${player.stack.toLocaleString()}`}</small></div>)}</div>
  </>;
}

type HouseControlProps = { state: HouseState; userId: string; busy: boolean; bet: number; setBet: (value: number) => void; side: string; setSide: (value: string) => void;
  action: (name: string, extra?: object) => Promise<void> };
function HouseControls({ state, userId, busy, bet, setBet, side, setSide, action }: HouseControlProps) {
  const myBet = state.bets[userId];
  return <div className="action-panel">
    {state.phase === "betting" && !myBet && <><label>Wager<input type="number" min="10" max="5000" step="10" value={bet} onChange={(event) => setBet(Number(event.target.value))} /></label>
      {state.game === "baccarat" && <label>Bet on<select value={side} onChange={(event) => setSide(event.target.value)}><option value="player">Player</option><option value="banker">Banker</option><option value="tie">Tie</option></select></label>}
      <button className="primary-button" disabled={busy} onClick={() => void action("bet", { amount: bet, side })}>Place bet {state.game === "ultimate" ? `· ${bet * 2} chips` : `· ${bet} chips`}</button></>}
    {state.phase === "betting" && Object.keys(state.bets).length > 0 && <button className="secondary-button" disabled={busy} onClick={() => void action("start")}>Deal round</button>}
    {state.phase === "playing" && state.turn === userId && <><span className="turn-label">YOUR TURN {state.stage ? `· ${state.stage.toUpperCase()}` : ""}</span>
      {state.game === "blackjack" ? <><button className="primary-button" disabled={busy} onClick={() => void action("hit")}>Hit</button><button className="secondary-button" disabled={busy} onClick={() => void action("stand")}>Stand</button><button className="secondary-button" disabled={busy || state.hands[userId]?.length !== 2} onClick={() => void action("double")}>Double</button></>
        : <>{state.stage !== "river" && <button className="secondary-button" disabled={busy} onClick={() => void action("check")}>Check</button>}
          <button className="primary-button" disabled={busy} onClick={() => void action("raise")}>Play {state.stage === "preflop" ? "4×" : state.stage === "flop" ? "2×" : "1×"}</button>
          {state.stage === "river" && <button className="secondary-button" disabled={busy} onClick={() => void action("fold")}>Fold</button>}</>}
    </>}
    {state.phase === "finished" && <button className="primary-button" disabled={busy} onClick={() => void action("next")}>Next round</button>}
    {state.phase === "playing" && state.turn !== userId && <span className="waiting-note">Waiting for {state.seats.find((seat) => seat.id === state.turn)?.name || "the table"}…</span>}
  </div>;
}

type PokerControlProps = { state: PokerState; userId: string; busy: boolean; raise: number; setRaise: (value: number) => void; action: (name: string, extra?: object) => Promise<void> };
function PokerControls({ state, userId, busy, raise, setRaise, action }: PokerControlProps) {
  const player = state.players.find((seat) => seat.id === userId);
  const need = player ? state.currentBet - player.bet : 0;
  return <div className="action-panel">
    {(state.phase === "waiting" || state.phase === "finished") && <button className="primary-button" disabled={busy || state.players.filter((seat) => seat.stack > 0).length < 2} onClick={() => void action("start")}>Deal {state.mode === "tournament" ? "tournament" : "next hand"}</button>}
    {player?.stack === 0 && state.mode === "cash" && ["waiting", "finished"].includes(state.phase) && <button className="secondary-button" disabled={busy} onClick={() => void action("rebuy")}>Rebuy · 1,000 chips</button>}
    {state.turn === userId && <><span className="turn-label">YOUR TURN · {need > 0 ? `${need} TO CALL` : "CHECK OR BET"}</span>
      <button className="secondary-button" disabled={busy} onClick={() => void action(need > 0 ? "call" : "check")}>{need > 0 ? `Call ${Math.min(need, player?.stack || 0)}` : "Check"}</button>
      <label>Raise total<input type="number" min={state.currentBet + state.minRaise} max={(player?.stack || 0) + (player?.bet || 0)} value={raise} onChange={(event) => setRaise(Number(event.target.value))} /></label>
      <button className="primary-button" disabled={busy} onClick={() => void action("raise", { amount: raise })}>Raise</button>
      <button className="secondary-button" disabled={busy} onClick={() => void action("fold")}>Fold</button></>}
    {state.turn && state.turn !== userId && <span className="waiting-note">Waiting for {state.players.find((seat) => seat.id === state.turn)?.name}…</span>}
    {state.phase === "complete" && <span className="waiting-note">Tournament complete. Return to the lobby for another table.</span>}
  </div>;
}
