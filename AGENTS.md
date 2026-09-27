git# Repository Guidelines

## Product Vision

DG Flops is a desktop-first, responsive social casino for entertainment with fake chips only. It must never offer deposits, withdrawals, cash prizes, or chip transfers for money. The intended games are Ultimate Hold'em, blackjack, baccarat, no-limit Texas Hold'em, and pot-limit Omaha. Human players share live tables; blackjack and similar games still play against a house dealer. Poker includes chip tables, private friend rooms, and initially simple single-table tournaments. Guests may play solo house games; accounts unlock multiplayer, table chat, achievements, and leaderboards. See `docs/PRODUCT.md` for the agreed scope.

## Project Structure & Module Organization

Use Next.js App Router with TypeScript. Put routes and layouts in `src/app/`, reusable UI in `src/components/`, pure game and economy logic in `src/lib/`, tests in `tests/`, and approved static assets in `public/`. Keep game rules separate from rendering and network code. The server must control chip balances, game outcomes, and private information in multiplayer games.

## Development Commands

Run `npm install` to restore dependencies, `npm run dev` for local development, `npm run build` for a production build, `npm run lint` for ESLint, and `npm run typecheck` for TypeScript checks. Update this section when a test runner or other required command is added.

## Vercel Deployment & Persistence

The production app must work in Vercel's serverless runtime. Never rely on a local file, process memory, or a long-lived WebSocket for durable accounts, wallets, rooms, chat, or game state. Use a hosted data service, keep credentials server-side, and document required environment variables. Make room actions atomic across concurrent requests. Keep local development usable without production credentials and verify the production build.

## Coding Style & Testing

Use two-space indentation, TypeScript, functional React components, and descriptive `camelCase` variables and functions. Name components and types in `PascalCase`; use lowercase route folders. Follow the repository ESLint configuration. Write focused tests for poker hand ranking, betting rounds, house-game rules, daily resets, XP accounting, and permissions before those systems are considered complete. Name tests `*.test.ts` or `*.test.tsx`.

## Economy, Audio & Safety

Reset each account to 10,000 chips at 00:00 UTC. Preserve game profit/loss and achievement history across resets. Leaderboards show weekly and all-time XP: signed net chips won or lost in games plus achievement XP; chip grants and resets do not count as game profit. Achievements may award chips and XP. Use only audio with permission for web use; artist names in the vision are style references. Give users independent controls for music and sound effects.

## Commits & Pull Requests

This directory has no Git history to infer a convention from. Use short, imperative commit subjects, such as `Add blackjack hand scoring`. Pull requests should describe the behavior, link relevant issues, list checks run, and include screenshots for visual changes.
