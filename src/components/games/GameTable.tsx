import type { HouseState } from "@/lib/games/house-room";
import type { PokerState } from "@/lib/games/poker-room";
import { CardRow, ChipStack, PlayingCard } from "./GameAssets";
import { Icon } from "../ui/Icon";
import { Wordmark } from "../ui/Wordmark";
import { GameMotion } from "./GameMotion";
import { blackjackTotal, baccaratTotal } from "@/lib/games/house";

type GameState = HouseState | PokerState;

function HouseDisplay({ state, userId }: { state: HouseState; userId: string }) {
  if (state.game === "baccarat") return <>
    <div className="table-brand-plaque"><Icon name="wave" /><span>BACCARAT <small>LET THE CARDS DO THE TALKING</small></span></div>
    <div className="baccarat-hands">{["player", "banker"].map((side, index) => <div className="card-well" key={side}><span className="zone-label">{side} hand {state.hands[side]?.length ? `· ${baccaratTotal(state.hands[side])}` : ""}</span><CardRow cards={state.hands[side] || []} slots={2} round={state.round} offset={index * 2} /></div>)}</div>
    <div className="baccarat-bets">{[{ id: "player", label: "Player", payout: "1 : 1" }, { id: "tie", label: "Tie", payout: "8 : 1" }, { id: "banker", label: "Banker", payout: "0.95 : 1" }].map((side) => <div className={`betting-zone ${state.bets[userId]?.side === side.id ? "selected-bet" : ""}`} key={side.id}><strong>{side.label}</strong><small>{side.payout}</small>{state.bets[userId]?.side === side.id && <ChipStack amount={state.bets[userId].amount} compact />}</div>)}</div>
    <div className="table-participants">{state.seats.map((seat) => <span key={seat.id}><Icon name="user" />{seat.name}{state.bets[seat.id] ? ` · ${state.bets[seat.id].amount} on ${state.bets[seat.id].side}` : " · choosing a side"}</span>)}</div>
  </>;

  return <>
    <div className="dealer-area"><span className="dealer-label"><i className="dealer-marker">D</i> House dealer {state.game === "blackjack" && state.dealer.length > 0 && `· ${blackjackTotal(state.dealer).total}`}</span><div className="card-well"><CardRow cards={state.dealer} slots={2} round={state.round} hidden={state.phase === "playing" ? state.game === "blackjack" ? 1 : 2 : 0} /></div></div>
    {state.game === "ultimate" ? <div className="community-area"><span className="zone-label">Community cards {state.stage && `· ${state.stage}`}</span><CardRow cards={state.board} slots={5} round={state.round} offset={2} /></div> : <div className="table-brand-plaque"><Icon name="wave" /><span>BLACKJACK <small>PAYS 3:2 · DEALER STANDS ON 17</small></span></div>}
    <div className="table-rules-strip">{state.game === "ultimate" ? "ANTE + BLIND TO ENTER · CHOOSE YOUR PLAY BET" : "DRAW TO 21 · MAKE YOURSELF COMFORTABLE"}</div>
    <div className="table-seats">{state.seats.map((seat, index) => {
      const bet = state.bets[seat.id];
      const hand = state.hands[seat.id] || [];
      const active = state.turn === seat.id;
      const result = state.settlements?.find((item) => item.userId === seat.id);
      return <div className={`seat-pod ${active ? "active-hand" : ""} ${bet?.folded ? "folded-hand" : ""} ${state.phase === "finished" && result && result.net > 0 ? "winning-hand" : ""}`} data-self={seat.id === userId} key={seat.id}>
        <div className="seat-pod-heading"><span className="seat-avatar">{seat.name[0].toUpperCase()}</span><span><strong>{seat.name}</strong><small>{active ? seat.id === userId ? "Your move" : "Playing" : seat.id === userId ? "You" : `Seat ${index + 1}`}</small></span>{active && <span className="turn-beacon" aria-label="Current turn" />}</div>
        {state.game === "blackjack" && (state.blackjackHands?.[seat.id]?.length || 0) > 1 ? <div className="split-hands">{state.blackjackHands![seat.id].map((split, i) => <div key={i} className={active && (state.handIndex?.[seat.id] || 0) === i ? "current-split" : ""}><small>Hand {i + 1} · {blackjackTotal(split.cards).total}</small><CardRow cards={split.cards} round={state.round} offset={i + 2} /></div>)}</div> : <><CardRow cards={hand} hidden={state.game === "ultimate" && bet && seat.id !== userId && state.phase !== "betting" ? 2 : 0} slots={2} round={state.round} offset={index + 2} />{state.game === "blackjack" && hand.length > 0 && <span className="hand-total">{blackjackTotal(hand).total > 21 ? "Bust" : blackjackTotal(hand).total}</span>}</>}
        <div className="seat-wager">{bet ? <><ChipStack amount={state.game === "ultimate" ? bet.amount * 2 + bet.play : state.blackjackHands?.[seat.id]?.reduce((sum, item) => sum + item.amount * (item.doubled ? 2 : 1), 0) || bet.amount * (bet.doubled ? 2 : 1)} compact /><span>{bet.folded ? "Folded" : "Wager"}</span></> : <span className="empty-bet-ring">Place your chips</span>}{state.phase === "finished" && result && result.payout > 0 && <span className="payout-chips"><ChipStack amount={result.payout} compact /> returned</span>}</div>
      </div>;
    })}</div>
  </>;
}

function PokerDisplay({ state, userId }: { state: PokerState; userId: string }) {
  const live = !["waiting", "finished", "complete"].includes(state.phase);
  return <>
    <div className="pot-display"><span className="zone-label">{live ? "In the middle" : "Pot"}</span><ChipStack amount={state.pot} /></div>
    <div className="community-area"><span className="zone-label">Community cards</span><CardRow cards={state.board} slots={5} round={state.hand} offset={2} /></div>
    <div className="table-rules-strip"><span>BLINDS 10 / 20</span><span>{state.game === "omaha" ? "USE 2 HOLE + 3 BOARD CARDS" : "NO-LIMIT HOLD'EM"}</span></div>
    <div className="table-seats poker-seats">{state.players.map((player, index) => <div className={`seat-pod ${state.turn === player.id ? "active-hand" : ""} ${player.folded ? "folded-hand" : ""} ${!live && (state.settlements?.find((item) => item.userId === player.id)?.net || 0) > 0 ? "winning-hand" : ""}`} data-self={player.id === userId} key={player.id}>
      <div className="seat-pod-heading"><span className="seat-avatar">{player.name[0].toUpperCase()}</span><span><strong>{player.name}</strong><small>{state.turn === player.id ? player.id === userId ? "Your move" : "Playing" : player.id === userId ? "You" : `Seat ${index + 1}`}</small></span>{index === state.button && <span className="dealer-marker" title="Dealer button">D</span>}</div>
      <CardRow cards={player.hole} hidden={player.hole.length === 0 && state.started && live && !player.folded ? state.game === "omaha" ? 4 : 2 : 0} slots={state.game === "omaha" ? 4 : 2} round={state.hand} offset={index} />
      <div className="seat-stack"><Icon name="chip" /><strong>{player.stack.toLocaleString()}</strong><span>stack</span></div>
      <div className="seat-wager">{player.bet > 0 && <ChipStack compact amount={player.bet} />}<span>{player.folded ? "Folded" : player.lastAction || "Ready to play"}</span></div>
    </div>)}</div>
    {state.players.length < 2 && <p className="table-waiting"><Icon name="users" /> A little company makes a great game. Invite a friend to deal.</p>}
  </>;
}

export function GameTable({ state, userId, animate = false }: { state: GameState; userId: string; animate?: boolean }) {
  return <GameMotion.Provider value={animate}><div className={`casino-table table-${state.game}`}>
    <div className="table-topline"><span><Wordmark compact /><b>{state.kind === "house" ? `ROUND ${state.round}` : `HAND ${state.hand}`}</b></span><span className="table-phase"><i className="status-light" />{state.phase}</span></div>
    <div className="table-deck" aria-hidden="true"><PlayingCard back /><PlayingCard back /></div>
    <div className="felt-inscription" aria-hidden="true"><strong>{state.game === "blackjack" ? "BLACKJACK PAYS 3 : 2" : state.game === "ultimate" ? "ULTIMATE HOLD’EM" : state.game === "baccarat" ? "PLAYER  •  TIE  •  BANKER" : state.game === "omaha" ? "POT-LIMIT OMAHA" : "TEXAS HOLD’EM"}</strong><span>{state.game === "blackjack" ? "DEALER STANDS ON ALL 17 · DOUBLE AFTER SPLIT" : state.kind === "poker" ? "BLINDS 10 / 20 · REAL FRIENDS, FUN CHIPS" : "MAKE YOURSELF AT HOME"}</span></div>
    {state.kind === "house" ? <HouseDisplay state={state} userId={userId} /> : <PokerDisplay state={state} userId={userId} />}
    <div className="table-felt-footer"><span>PLAY FOR THE MOMENT</span><span>FUN CHIPS ONLY</span></div>
  </div></GameMotion.Provider>;
}
