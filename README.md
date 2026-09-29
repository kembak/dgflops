# DG Flops

DG Flops is a social, fun-play casino built with Next.js and TypeScript. Chips have no monetary value. See [the product brief](docs/PRODUCT.md) for its intended scope.

## Run locally

Use Node.js 20.9 or newer. Pull the Vercel development variables into `.env.local` to use Turso, or explicitly put `DG_DATABASE_MODE=local` in that file for independent SQLite development. Missing configuration fails safely rather than silently switching databases. Existing local SQLite/legacy JSON records are preserved. See [database setup and migration safety](docs/DATABASE.md).

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Before submitting changes, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Connect the repository to Vercel and its Turso integration. In the Vercel project, verify that both server-side variables are available for Production, Preview, and Development:

```text
FLOPSTORAGE_TURSO_DATABASE_URL
FLOPSTORAGE_TURSO_AUTH_TOKEN
```

The connected Turso database is initialized non-destructively on the first server request. Never prefix these variables with `NEXT_PUBLIC_` or commit their values. Pull with `vercel env pull .env.local` (Vercel CLI login required), remove any local-mode override, and restart. `npm run db:status` identifies the target without exposing secrets; `npm run db:migrate` applies additive v2 metadata with a retained migration backup. Vercel must not use filesystem persistence. Redeploy after variable changes.

Contributor conventions are in [AGENTS.md](AGENTS.md).

## Interface architecture

The Aero Garden design is specified in [the design system](docs/DESIGN_SYSTEM.md). Clear acrylic game objects share day-garden/moonlit-lagoon tokens. The appearance menu follows the system by default. Desktop tables keep decisions below the playing surface and bounded chat on the right; mobile uses natural vertical flow. [Architecture and supported rules](docs/ARCHITECTURE.md) explain authoritative games, reconnects, account relationships, and administration. Music playback remains unchanged.

The top music strip scrolls with the page. The floating receiver can be hidden/restored without stopping playback; both presentations control the same audio element. Its visibility preference is separate from audio preferences. With no saved visibility preference, tables start with the receiver collapsed to keep the play area clear.

`npm test` covers engines, persistence/authorization, carousel input, and presentation. Run `npm run start -- -p 3002` then `npm run test:smoke` for read-only HTTP checks; set `SMOKE_BASE_URL` for a different port. Browser checks are recorded in [UI verification](docs/UI_VERIFICATION.md). To bootstrap administration, create the intended account, verify the database fingerprint, then run `npm run admin:bootstrap -- ExactUsername`; later role changes require an existing admin and an audit reason.

## Music and sound

Add web-licensed MP3, M4A, OGG, or WAV files to the single music folder, `public/music/`. The `predev` and `prebuild` scripts scan it and generate `src/lib/music-catalog.json`; restart the dev server after adding files. No external music is fetched. ID3/container title, artist, and embedded cover art are read when available; filenames provide a fallback. The player shows a small DG cover when artwork is absent.

Prefix filenames to assign playlists: `lobby--evening.mp3`, `blackjack--midnight.mp3`, `baccarat--track.mp3`, `ultimate--track.mp3`, `holdem--track.mp3`, or `omaha--track.mp3`. Files named `all--track.mp3` or without a recognized prefix play in every area. To change a playlist, rename or replace files in this folder and rebuild. The current track continues across routes if it belongs to both playlists; otherwise the player fades between tracks. Music and sound effects default on, with separate saved volume controls. Browsers may wait for the first user interaction before starting music.
