# DG Flops implementation plan

This file tracks the work toward the first playable release described in `docs/PRODUCT.md`.

## 1. Foundation and rules — in progress

- [x] Inspect the starter and read the project guidance.
- [ ] Add persistent database, account sessions, daily reset, ledger, and XP achievements.
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

- Use a hosted Redis REST store for Vercel and a local file store for development, both behind one transactional state interface. Package installation is currently blocked by automatic approval review, so the remote adapter will use built-in `fetch`.
- Poll HTTP endpoints for multiplayer updates so Vercel functions can serve the application without a long-lived socket server.
- The server decides cards, legal actions, chip changes, achievements, and rank XP. Guests can only use solo house games; their chips are local to their browser and do not enter rankings.
- Daily wallet reset is 10,000 chips at 00:00 UTC. Game profit/loss and earned achievement XP survive resets.
