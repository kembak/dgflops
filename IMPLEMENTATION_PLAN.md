# DG Flops implementation plan

This file tracks the work toward the first playable release described in `docs/PRODUCT.md`.

## Aero Garden redesign — active

### Clear acrylic refinement

- [x] Inspect the existing implementation and document refinements before coding.
- [x] Extend shared acrylic materials, day/moonlit tokens, and name-first identity.
- [x] Replace discovery tiles with an accessible dimensional object carousel.
- [x] Add shared top/floating music controls and persistent hide/restore.
- [x] Refactor all game workspaces to prioritize viewport-fit decisions and hands.
- [x] Run ten render tests, lint, type checking, production build, HTTP smoke checks, and final documentation sync.
- [ ] Complete rendered desktop/mobile acceptance, both themes, and live input/audio checks. Blocked: no available browser connector. See `docs/UI_VERIFICATION.md`; viewport fit is not yet visually certified.

- [x] Audit all source, routes, assets, and project Markdown; research Frutiger Aero and period UX guidance.
- [x] Write the pre-coding specification in `docs/DESIGN_SYSTEM.md` and update related Markdown.
- [x] Build tokens, shared shell, icons, dialogs, and reusable cards/chips.
- [x] Redesign lobby, discovery, account dialogs, profile, and leaderboard.
- [x] Redesign all five games and their controls, seats, and feedback.
- [x] Redesign effects while preserving the music playback core and tracks. Later refinements extend only the player interface.
- [ ] Finish browser accessibility and responsive verification; static checks/build and documentation are complete.

## 1. Foundation and rules — in progress

The following release checklist predates the presentation work. Existing implementations are not a substitute for the outstanding full game-engine and release verification.

- [x] Inspect the starter and read the project guidance.
- [x] Add transactional Turso persistence with local SQLite fallback, account sessions, daily reset, ledger, and XP achievements.
- [ ] Implement and test cards, poker ranking, betting, and house game resolution as pure modules.

## 2. Play and social systems — pending

- [ ] Add account and guest flows, public and private rooms, membership, and table chat.
- [ ] Make server-authoritative house tables playable for blackjack, baccarat, and Ultimate Hold'em.
- [ ] Make no-limit Hold'em and pot-limit Omaha cash tables and single-table tournaments playable.
- [ ] Handle reconnection, turn timeouts, chip accounting, and private card visibility.

## 3. Experience and release — pending

- [ ] Turn the preview into a responsive lobby and table UI with achievements and weekly/all-time leaderboards.
- [ ] Add permitted original audio, separate music/effects controls, and reduced-motion support.
- [ ] Run meaningful tests, lint, type checking, production build, and browser flows.
- [ ] Review product requirements, document deployment configuration and any remaining gaps.

## Decisions

- Use Turso/libSQL on Vercel with the `FLOPSTORAGE_` integration variables and local SQLite without credentials. The existing state snapshot is stored in one `app_state` row; a database write transaction serializes all state changes. Normalize high-volume tables if this becomes a scaling bottleneck.
- Poll HTTP endpoints for multiplayer updates so Vercel functions can serve the application without a long-lived socket server.
- The server decides cards, legal actions, chip changes, achievements, and rank XP. Guests can only use solo house games; their server-side guest wallets do not enter rankings.
- Daily wallet reset is 10,000 chips at 00:00 UTC. Game profit/loss and earned achievement XP survive resets.
