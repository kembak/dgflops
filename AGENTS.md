# Repository Guidelines

## Product Vision

DG Flops is a responsive social casino with fake chips only: never add deposits, withdrawals, cash prizes, or chip sales. Games include Ultimate Hold'em, blackjack, baccarat, Texas Hold'em, and Omaha. Accounts unlock human multiplayer, private rooms, chat, achievements, and leaderboards; guests may play solo house games. See `docs/PRODUCT.md` for the full scope.

## Project Structure & Module Organization

Use Next.js App Router and TypeScript. Routes belong in `src/app/`, UI in `src/components/`, game and economy logic in `src/lib/`, tests in `tests/`, and approved assets in `public/`. Keep rules separate from rendering; the server controls chips, outcomes, and private cards.

## Development Commands

Run `npm install`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Tests use Node's test runner through `tsx` and isolated temporary databases. `npm run test:smoke` targets port 3002 by default. Use `npm run db:status` to verify database identity safely.

## Vercel Deployment & Persistence

Production uses Turso through `@libsql/client`. Configure both `FLOPSTORAGE_TURSO_DATABASE_URL` and `FLOPSTORAGE_TURSO_AUTH_TOKEN`; never expose them through `NEXT_PUBLIC_`. Local SQLite requires explicit `DG_DATABASE_MODE=local` and must not coexist with Turso credentials. Missing/partial configuration fails closed. Preserve the transactional `app_state` snapshot and all records. Use additive, backup-preserving `npm run db:migrate`; never reset/drop data on startup or deployment. See `docs/DATABASE.md` and `docs/ARCHITECTURE.md`.

## Coding Style & Testing

Use two-space indentation, functional React components, `camelCase` variables/functions, `PascalCase` components/types, and lowercase routes. Follow ESLint. Test poker ranking, betting, house rules, daily resets, XP, and permissions; name tests `*.test.ts` or `*.test.tsx`.

## Design System

Follow `docs/DESIGN_SYSTEM.md`: clear acrylic Aero Garden with shared day/moonlit tokens. Keep desktop table and decisions above the fold, with bounded chat on the right; mobile flows vertically. Carousel objects launch through the shared callback; only object hitboxes intercept wheel input. Support keyboard/touch and reduced motion. Keep engine authority separate from motion, and preserve the single AppProvider music system.

## Economy, Audio & Safety

Reset accounts to 10,000 chips at 00:00 UTC, preserving profit/loss and achievements. Weekly and all-time XP equals signed game net chips plus achievement XP; grants and resets are not profit. Put only web-licensed music in `public/music/`; `predev`/`prebuild` generate its catalog and metadata. Never add external-stream URLs. Keep separate persistent music/effects controls.

## Commits & Pull Requests

Use imperative commits, such as `Add blackjack hand scoring`. PRs should describe behavior, link issues, list checks, and include screenshots for visual changes.
