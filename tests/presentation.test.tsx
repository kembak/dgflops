import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GameTable } from "../src/components/games/GameTable";
import { HouseControls, PokerControls } from "../src/components/games/GameControls";
import { GameCarousel } from "../src/components/games/GameCarousel";
import { Wordmark } from "../src/components/ui/Wordmark";
import { newHouseState, type HouseGame } from "../src/lib/games/house-room";
import { newPokerState, type PokerGame } from "../src/lib/games/poker-room";
import { games } from "../src/lib/game-catalog";
import type { Card } from "../src/lib/games/cards";

const noop = () => {};
const action = async () => {};
const cards: Card[] = [{ rank: 14, suit: "♠" }, { rank: 13, suit: "♥" }];
const seatNames = Array.from({ length: 6 }, (_, i) => ({ id: `seat${i}`, name: `Player ${i}` }));

for (const game of ["blackjack", "ultimate", "baccarat"] as HouseGame[]) {
  test(`${game}: six-seat table renders all seats, own cards and betting controls`, () => {
    const state = newHouseState(game);
    state.seats = seatNames;
    const table = renderToStaticMarkup(<GameTable state={state} userId="seat0" />);
    for (const seat of seatNames) assert.ok(table.includes(seat.name));
    const betting = renderToStaticMarkup(<HouseControls state={state} userId="seat0" busy={false} bet={100} setBet={noop} side="player" setSide={noop} action={action} />);
    assert.match(betting, /Place (100|200) chips/);
    if (game === "baccarat") assert.match(betting, /Bet on/);
    state.bets.seat0 = { amount: 100, play: 0, doubled: false, folded: false };
    assert.match(renderToStaticMarkup(<HouseControls state={state} userId="seat0" busy={false} bet={100} setBet={noop} side="player" setSide={noop} action={action} />), /Deal round/);
    state.phase = "playing"; state.turn = "seat0"; state.hands.seat0 = cards;
    const playing = renderToStaticMarkup(<GameTable state={state} userId="seat0" />);
    if (game !== "baccarat") assert.match(playing, /Ace of spades/);
  });
}

test("blackjack: Hit, Stand and Double coexist during the player's turn", () => {
  const state = newHouseState("blackjack"); state.phase = "playing"; state.turn = "seat0"; state.hands.seat0 = cards;
  const html = renderToStaticMarkup(<HouseControls state={state} userId="seat0" busy={false} bet={100} setBet={noop} side="player" setSide={noop} action={action} />);
  for (const label of ["Hit", "Stand", "Double"]) assert.ok(html.includes(label));
});

test("long blackjack hands retain every readable card and expose their fan count", () => {
  const state = newHouseState("blackjack"); state.seats = seatNames; state.phase = "playing";
  state.hands.seat0 = Array.from({ length: 11 }, (_, i) => ({ rank: i % 3 + 2, suit: "♠" }));
  const html = renderToStaticMarkup(<GameTable state={state} userId="seat0" />);
  assert.match(html, /data-card-count="11"/);
  assert.equal((html.match(/aria-label="[234] of spades"/g) || []).length, 11);
});

test("Ultimate: stage-dependent decisions and dealer privacy are preserved", () => {
  const state = newHouseState("ultimate"); state.phase = "playing"; state.turn = "seat0"; state.seats = seatNames;
  state.bets.seat0 = { amount: 100, play: 0, doubled: false, folded: false };
  for (const stage of ["preflop", "flop", "river"] as const) {
    state.stage = stage;
    const html = renderToStaticMarkup(<HouseControls state={state} userId="seat0" busy={false} bet={100} setBet={noop} side="player" setSide={noop} action={action} />);
    assert.match(html, /Play/); assert.ok(html.includes(stage === "river" ? "Fold" : "Check"));
    if (stage !== "river") assert.ok(!html.includes(">Fold<"));
  }
  assert.match(renderToStaticMarkup(<GameTable state={state} userId="seat0" />), /Face-down card/);
});

for (const game of ["holdem", "omaha"] as PokerGame[]) {
  test(`${game}: full table keeps cards, opponents, pot, and decisions present`, () => {
    const state = newPokerState(game, "cash"); state.phase = "flop"; state.started = true; state.turn = "seat0"; state.pot = 120;
    state.players = seatNames.map((seat) => ({ ...seat, stack: 980, bet: 20, contributed: 20, folded: false, acted: false, hole: seat.id === "seat0" ? game === "omaha" ? [...cards, { rank: 12, suit: "♦" }, { rank: 11, suit: "♣" }] : cards : [], lastAction: "Call" }));
    state.board = [{ rank: 4, suit: "♠" }, { rank: 5, suit: "♦" }, { rank: 6, suit: "♥" }];
    const html = renderToStaticMarkup(<GameTable state={state} userId="seat0" />);
    for (const seat of seatNames) assert.ok(html.includes(seat.name));
    assert.match(html, /Community cards/); assert.match(html, /Ace of spades/); assert.match(html, /120/);
    assert.equal((html.match(/aria-label="Face-down card"/g) || []).length, 2 + 5 * (game === "omaha" ? 4 : 2)); // includes decorative deck
    state.currentBet = 20;
    let controls = renderToStaticMarkup(<PokerControls state={state} userId="seat0" busy={false} raise={40} setRaise={noop} action={action} />);
    for (const label of ["Check", "Raise", "Fold"]) assert.ok(controls.includes(label));
    state.currentBet = 40;
    controls = renderToStaticMarkup(<PokerControls state={state} userId="seat0" busy={false} raise={60} setRaise={noop} action={action} />);
    assert.match(controls, /Call 20/);
  });
}

test("carousel has accessible manual controls, selection, and filtered/empty states", () => {
  const html = renderToStaticMarkup(<GameCarousel items={games} onLaunch={noop} />);
  assert.match(html, /aria-roledescription="carousel"/);
  assert.match(html, /aria-label="Previous game"/); assert.match(html, /aria-label="Next game"/);
  assert.equal((html.match(/class="carousel-object /g) || []).length, 5);
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
  assert.equal(renderToStaticMarkup(<GameCarousel items={[]} onLaunch={noop} />), "");
  const single = renderToStaticMarkup(<GameCarousel items={[games[2]]} onLaunch={noop} />);
  assert.match(single, /Play Baccarat/); assert.ok(!single.includes("Select Blackjack"));
});

test("full and compact wordmarks preserve the accessible name", () => {
  for (const compact of [true, false]) assert.match(renderToStaticMarkup(<Wordmark compact={compact} />), /aria-label="DG Flops"/);
});
