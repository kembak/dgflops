import type { HouseState } from "@/lib/games/house-room";
import type { PokerState } from "@/lib/games/poker-room";
import { Icon } from "../ui/Icon";

type Action = (name: string, extra?: object) => Promise<void>;
type HouseProps = { state: HouseState; userId: string; busy: boolean; bet: number; setBet: (value: number) => void; side: string; setSide: (value: string) => void; action: Action };

export function HouseControls({ state, userId, busy, bet, setBet, side, setSide, action }: HouseProps) {
  const myBet = state.bets[userId];
  const hand = state.hands[userId] || [];
  const splitValue = (rank: number) => rank === 14 ? 11 : Math.min(rank, 10);
  const canSplit = hand.length === 2 && splitValue(hand[0].rank) === splitValue(hand[1].rank) && (state.blackjackHands?.[userId]?.length || 1) < 4;
  return <div className="action-panel" aria-label="Game actions" aria-busy={busy}>
    {state.phase === "betting" && !myBet && <>
      <div className="wager-picker"><span className="control-label">Choose your chips</span><div className="wager-presets">{[25, 100, 500].map((amount) => <button key={amount} className="wager-chip" data-accent={amount === 25 ? "aqua" : amount === 100 ? "sky" : "amber"} aria-pressed={bet === amount} onClick={() => setBet(amount)} disabled={busy} data-sound="select">{amount}</button>)}</div></div>
      <label>Wager<input type="number" min="10" max="5000" step="10" value={bet} onChange={(event) => setBet(Number(event.target.value))} /></label>
      {state.game === "baccarat" && <label>Bet on<select value={side} onChange={(event) => setSide(event.target.value)}><option value="player">Player</option><option value="banker">Banker</option><option value="tie">Tie</option></select></label>}
      <button className="primary-button" disabled={busy} onClick={() => void action("bet", { amount: bet, side })}>Place {state.game === "ultimate" ? bet * 2 : bet} chips <Icon name="chip" /></button>
    </>}
    {state.phase === "betting" && Object.keys(state.bets).length > 0 && <button className="primary-button" disabled={busy} onClick={() => void action("start")}>Deal round <Icon name="cards" /></button>}
    {state.phase === "betting" && myBet && <span className="waiting-note"><Icon name="check" /> Your chips are on the table.</span>}
    {state.phase === "playing" && state.turn === userId && <><span className="turn-label"><i className="status-light" /> Your turn {state.stage && `· ${state.stage}`}</span>
      {state.game === "blackjack" ? <><button className="primary-button" disabled={busy} onClick={() => void action("hit")}>Hit <Icon name="cards" /></button><button className="secondary-button" disabled={busy} onClick={() => void action("stand")}>Stand</button><button className="secondary-button" disabled={busy || state.hands[userId]?.length !== 2} onClick={() => void action("double")}>Double</button>{canSplit && <button className="secondary-button" disabled={busy} onClick={() => void action("split")}>Split</button>}</> : <>
        {state.stage !== "river" && <button className="secondary-button" disabled={busy} onClick={() => void action("check")}>Check</button>}
        <button className="primary-button" disabled={busy} onClick={() => void action("raise")}>Play {state.stage === "preflop" ? "4×" : state.stage === "flop" ? "2×" : "1×"}<Icon name="chip" /></button>
        {state.stage === "preflop" && <button className="secondary-button" disabled={busy} onClick={() => void action("raise", { amount: 3 })}>Play 3×</button>}
        {state.stage === "river" && <button className="secondary-button" disabled={busy} onClick={() => void action("fold")}>Fold</button>}
      </>}
    </>}
    {state.phase === "finished" && <button className="primary-button" disabled={busy} onClick={() => void action("next")}>Next round <Icon name="arrow" /></button>}
    {state.phase === "playing" && state.turn !== userId && <span className="waiting-note">Waiting for {state.seats.find((seat) => seat.id === state.turn)?.name || "the table"}…</span>}
  </div>;
}

export function PokerControls({ state, userId, busy, raise, setRaise, action }: { state: PokerState; userId: string; busy: boolean; raise: number; setRaise: (value: number) => void; action: Action }) {
  const player = state.players.find((seat) => seat.id === userId);
  const need = player ? state.currentBet - player.bet : 0;
  const maxRaise = player ? Math.min(player.stack + player.bet, state.game === "omaha" ? state.currentBet + state.pot + need : Infinity) : 0;
  const canRaise = player && maxRaise > state.currentBet && (!player.acted || state.currentBet - (player.actedAtBet ?? player.bet) >= state.minRaise) && state.players.some((other) => other.id !== userId && !other.folded && other.stack > 0);
  return <div className="action-panel" aria-label="Poker actions" aria-busy={busy}>
    {(state.phase === "waiting" || state.phase === "finished") && <button className="primary-button" disabled={busy || state.players.filter((seat) => seat.stack > 0).length < 2} onClick={() => void action("start")}>Deal {state.mode === "tournament" ? "tournament" : "next hand"}<Icon name="cards" /></button>}
    {player?.stack === 0 && state.mode === "cash" && ["waiting", "finished"].includes(state.phase) && <button className="secondary-button" disabled={busy} onClick={() => void action("rebuy")}>Rebuy · 1,000 chips</button>}
    {state.turn === userId && <><span className="turn-label"><i className="status-light" /> Your turn · {need > 0 ? `${need} to call` : "Check or bet"}</span>
      <button className="secondary-button" disabled={busy} onClick={() => void action(need > 0 ? "call" : "check")}>{need > 0 ? `Call ${Math.min(need, player?.stack || 0)}` : "Check"}</button>
      <label>Raise total (max {maxRaise})<input type="number" disabled={!canRaise} min={Math.min(state.currentBet + state.minRaise, maxRaise)} max={maxRaise} value={raise} onChange={(event) => setRaise(Number(event.target.value))} /></label>
      <button className="primary-button" disabled={busy || !canRaise} onClick={() => void action("raise", { amount: raise })}>Raise <Icon name="chip" /></button>
      <button className="secondary-button" disabled={busy} onClick={() => void action("fold")}>Fold</button>
    </>}
    {state.turn && state.turn !== userId && <span className="waiting-note">Waiting for {state.players.find((seat) => seat.id === state.turn)?.name}…</span>}
    {state.phase === "complete" && <span className="waiting-note"><Icon name="trophy" /> Tournament complete. Find another table in the lobby.</span>}
  </div>;
}
