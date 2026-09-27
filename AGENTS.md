# Repository Guidelines

## Product Vision

DG Flops is a responsive social casino with fake chips only: never add deposits, withdrawals, cash prizes, or chip sales. Games include Ultimate Hold'em, blackjack, baccarat, Texas Hold'em, and Omaha. Accounts unlock human multiplayer, private rooms, chat, achievements, and leaderboards; guests may play solo house games. See `docs/PRODUCT.md` for the full scope.

## Project Structure & Module Organization

Use Next.js App Router and TypeScript. Routes belong in `src/app/`, UI in `src/components/`, game and economy logic in `src/lib/`, tests in `tests/`, and approved assets in `public/`. Keep rules separate from rendering; the server controls chips, outcomes, and private cards.

## Development Commands

Run `npm install`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Tests use Node's test runner through `tsx`. With the production server on port 3002, `npm run test:smoke` checks route and audio-element rendering. Local development uses SQLite automatically without Turso credentials.

## Vercel Deployment & Persistence

Production uses Turso through `@libsql/client`. Configure `FLOPSTORAGE_TURSO_DATABASE_URL` and `FLOPSTORAGE_TURSO_AUTH_TOKEN` in every Vercel environment; never expose them through `NEXT_PUBLIC_`. Without them, local development uses `data/dgflops.sqlite`, importing an existing JSON store once if empty. The `app_state` snapshot is updated in write transactions. Never use local files, process memory, or long-lived WebSockets for production state. Test data-preserving schema changes locally before deployment.

## Coding Style & Testing

Use two-space indentation, functional React components, `camelCase` variables/functions, `PascalCase` components/types, and lowercase routes. Follow ESLint. Test poker ranking, betting, house rules, daily resets, XP, and permissions; name tests `*.test.ts` or `*.test.tsx`.

## Design System

Follow `docs/DESIGN_SYSTEM.md`: clear acrylic Aero Garden, with day and moonlit appearances sharing semantic tokens. Reuse the wordmark, object carousel, icons, dialogs, cards, and chips. Desktop game tables and primary decisions must fit together above the fold; move secondary chat below. Support mobile, keyboard focus, and reduced motion. Preserve game rules and music playback architecture, tracks, and preferences; music interface extensions must reuse the single AppProvider.

## Economy, Audio & Safety

Reset accounts to 10,000 chips at 00:00 UTC, preserving profit/loss and achievements. Weekly and all-time XP equals signed game net chips plus achievement XP; grants and resets are not profit. Put only web-licensed music in `public/music/`; `predev`/`prebuild` generate its catalog and metadata. Never add external-stream URLs. Keep separate persistent music/effects controls.

## Commits & Pull Requests

Use imperative commits, such as `Add blackjack hand scoring`. PRs should describe behavior, link issues, list checks, and include screenshots for visual changes.
