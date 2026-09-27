"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, useApp } from "@/components/AppContext";
import { openAccount } from "@/components/SiteHeader";
import { GameTable } from "@/components/games/GameTable";
import { HouseControls, PokerControls } from "@/components/games/GameControls";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, LoadingState } from "@/components/ui/PageElements";
import { gameNames } from "@/lib/game-catalog";
import type { EffectName } from "@/lib/audio";
import type { HouseState } from "@/lib/games/house-room";
import type { PokerState } from "@/lib/games/poker-room";

type Room = { id: string; code: string | null; game: string; mode: string; visibility: string; hostId: string; seated: boolean; version: number;
  state: HouseState | PokerState; messages: { id: string; body: string; createdAt: string; username: string }[] };

function cardCount(state: HouseState | PokerState): number {
  if (state.kind === "poker") return state.board.length + state.players.reduce((sum, player) => sum + player.hole.length, 0);
  return state.dealer.length + state.board.length + Object.values(state.hands).reduce((sum, hand) => sum + hand.length, 0);
}

function resultTone(room: Room, username: string): "win" | "lose" | "neutral" {
  if (room.state.kind === "house") {
    const entry = room.state.result.split(" · ").find((item) => item.startsWith(`${username}: `));
    const net = entry ? Number(entry.slice(username.length + 2)) : 0;
    return net > 0 ? "win" : net < 0 ? "lose" : "neutral";
  }
  return room.state.message.split(" · ").some((entry) => entry.startsWith(`${username} won `) || entry.startsWith(`${username} wins `)) ? "win" : "lose";
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready, refresh, sound, setAudioZone } = useApp();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bet, setBet] = useState(100);
  const [side, setSide] = useState("player");
  const [raise, setRaise] = useState(40);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const tickBusy = useRef(false);
  const previousRoom = useRef<Room | null>(null);
  const soundRef = useRef(sound);
  const userId = user?.id;
  const username = user?.username || "";
  const game = room?.game;
  useEffect(() => { if (game) setAudioZone(game); }, [game, setAudioZone]);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  useEffect(() => {
    if (!room) return;
    const before = previousRoom.current;
    previousRoom.current = room;
    if (!before || before.id !== room.id || before.version === room.version) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const round = room.state.kind === "house" ? room.state.round : room.state.hand;
    const oldRound = before.state.kind === "house" ? before.state.round : before.state.hand;
    const count = Math.max(0, cardCount(room.state) - (round === oldRound ? cardCount(before.state) : 0));
    for (let index = 0; index < Math.min(count, 3); index++) timers.push(setTimeout(() => soundRef.current("card"), 80 + index * 130));
    if (before.state.phase !== room.state.phase && ["finished", "complete"].includes(room.state.phase) && room.seated) {
      timers.push(setTimeout(() => soundRef.current(resultTone(room, username)), count ? 600 : 60));
    } else if (room.state.turn === userId && before.state.turn !== userId) timers.push(setTimeout(() => soundRef.current("notify"), 180));
    return () => timers.forEach(clearTimeout);
  }, [room, userId, username]);

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
      const cue: EffectName = ["bet", "raise", "call", "double", "rebuy"].includes(name) ? "chip" : "select";
      if (!["start", "hit"].includes(name)) sound(cue);
      await refresh();
      if (name === "leave") router.push("/");
    } catch (cause) { sound("error"); setError(cause instanceof Error ? cause.message : "Action failed."); }
    finally { setBusy(false); }
  }

  async function chat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try { setRoom(await api<Room>(`/api/rooms/${id}`, { action: "chat", body: message })); setMessage(""); sound("confirm"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send your message."); }
    finally { setBusy(false); }
  }

  const finished = room && ["finished", "complete"].includes(room.state.phase);
  const tone = room && finished && room.seated ? resultTone(room, username) : "neutral";
  return <main id="main-content" className="room-page">
    <nav className="table-breadcrumb" aria-label="Breadcrumb"><Link href="/" data-sound="navigate">← The lobby</Link><span>/</span><span>{room ? gameNames[room.game] : "Your table"}</span></nav>
    {!ready || (user && !room && !error) ? <div className="panel"><LoadingState label="Preparing your table…" /></div> : !user ? <div className="panel"><EmptyState icon="user" title="There's a seat waiting for you."><p>Sign in or try a solo house game as a guest.</p><button className="primary-button" onClick={openAccount}>Come on in <Icon name="arrow" /></button></EmptyState></div> : !room ? <div className="panel"><EmptyState title="We couldn't open this table."><p className="form-error" role="alert">{error}</p><Link className="secondary-button" href="/">Back to the lobby</Link></EmptyState></div> : <>
      <div className="table-heading"><div><p className="eyebrow">{room.mode === "house" ? "AT YOUR OWN PACE" : room.mode === "cash" ? "A LITTLE FRIENDLY COMPETITION" : "SIT-AND-GO TOURNAMENT"}</p><h1>{gameNames[room.game]}</h1></div><div className="table-code">{room.visibility === "private" ? <><Icon name="lock" /><span>Invite code <strong>{room.code}</strong></span><button className="secondary-button" onClick={async () => { try { if (room.code) { await navigator.clipboard.writeText(room.code); setCopied(true); sound("confirm"); } } catch { setError("Copy the invite code shown here to share it."); } }}>{copied ? "Copied" : "Copy"}</button></> : <span className="status-badge"><i className="status-light" /> {room.visibility === "solo" ? "Your solo table" : "Public table"}</span>}</div></div>
      <div className="table-layout"><section className="table-main" aria-label={`${gameNames[room.game]} game`}>
        <GameTable state={room.state} userId={user.id} />
        <div className="decision-console">
        <div className={`table-status ${finished ? `result-${tone}` : ""}`} role="status"><Icon name={finished ? tone === "win" ? "trophy" : tone === "lose" ? "wave" : "check" : "info"} /><span>{finished && <strong>{tone === "win" ? "A lovely hand. " : tone === "lose" ? "On to the next one. " : "Round complete. "}</strong>}{room.state.kind === "house" ? room.state.result : room.state.message}</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!room.seated ? <button className="primary-button" disabled={busy || user.guest} onClick={() => void action("join")}>Take a seat {room.state.kind === "poker" ? "· 1,000 chips" : ""}<Icon name="arrow" /></button> : room.state.kind === "house" ? <HouseControls state={room.state} userId={user.id} busy={busy} bet={bet} setBet={setBet} side={side} setSide={setSide} action={action} /> : <PokerControls state={room.state} userId={user.id} busy={busy} raise={raise} setRaise={setRaise} action={action} />}
        </div>
      </section><aside className="table-sidebar">
        <div className="panel seats-panel"><div className="panel-heading"><div><p className="eyebrow">GOOD COMPANY</p><h2>At the table</h2></div><Icon name="users" /></div>
          {(room.state.kind === "house" ? room.state.seats : room.state.players).map((player) => <div className="seat-line" key={player.id}><span className="seat-avatar">{player.name[0].toUpperCase()}</span><span>{player.name}{player.id === user.id && <small> You</small>}</span>{"stack" in player && typeof player.stack === "number" && <strong>{player.stack.toLocaleString()}</strong>}</div>)}
        </div>
        <div className="panel chat-panel"><div className="panel-heading"><div><p className="eyebrow">A LITTLE TABLE TALK</p><h2>Say hello.</h2></div><Icon name="chat" /></div>
          <div className="chat-messages" role="log" aria-label="Table chat" aria-live="polite" aria-relevant="additions">{room.messages.length ? room.messages.map((item) => <p key={item.id}><strong>{item.username}</strong><span>{item.body}</span></p>) : <p className="empty-copy">Good hands start with good company.</p>}</div>
          {room.seated && !user.guest ? <form className="chat-form" onSubmit={chat}><input aria-label="Chat message" maxLength={300} placeholder="Say something nice…" value={message} onChange={(event) => setMessage(event.target.value)} /><button className="icon-button" disabled={busy || !message.trim()} aria-label="Send message"><Icon name="arrow" /></button></form> : <p className="fine-print">Sign in and take a seat to chat.</p>}
        </div>
        {room.seated && <button className="text-button leave-button" disabled={busy} onClick={() => void action("leave")}>Leave table <Icon name="arrow" /></button>}
      </aside></div>
      <p className="fine-print table-disclaimer">Fun-play chips have no monetary value. Turns last 60 seconds; timed-out players check when possible, otherwise fold or stand.</p>
    </>}
  </main>;
}
