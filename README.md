# DG Flops

DG Flops is a social, fun-play casino built with Next.js and TypeScript. Chips have no monetary value. See [the product brief](docs/PRODUCT.md) for its intended scope.

## Run locally

Use Node.js 20.9 or newer. Without Turso variables, the app uses local SQLite at `data/dgflops.sqlite`. An existing `data/dgflops.json` is imported once if that SQLite store is empty; retain the JSON file as a backup.

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

The connected Turso database is initialized automatically on the first server request. Never prefix these variables with `NEXT_PUBLIC_` or commit their values. To test Turso locally, pull the Vercel development environment with `vercel env pull .env.local` (Vercel CLI login required), then run `npm run dev`. Without that file, local SQLite remains usable. Vercel deployments must not use filesystem persistence. Redeploy after changing environment variables.

Contributor conventions are in [AGENTS.md](AGENTS.md).

## Interface architecture

The Aero Garden design is specified in [the design system](docs/DESIGN_SYSTEM.md). Clear molded acrylic, original outlined lettering, and a manually operated 3D game-object carousel share day-garden and moonlit-lagoon tokens. The appearance selector follows the system by default and remembers explicit choices. Desktop tables put decisions beside the playing surface; mobile uses natural vertical flow. Game engines, API contracts, persistence, and music playback remain unchanged.

The top music strip scrolls with the page. The floating receiver can be hidden/restored without stopping playback; both presentations control the same audio element. Its visibility preference is separate from audio preferences. With no saved visibility preference, tables start with the receiver collapsed to keep the play area clear.

`npm test` runs presentation regression tests (not a complete game-engine suite). Run `npm run start -- -p 3002` and then `npm run test:smoke` for read-only HTTP checks; set `SMOKE_BASE_URL` for a different port. Browser acceptance checks and outstanding verification are listed in [UI verification](docs/UI_VERIFICATION.md).

## Music and sound

Add web-licensed MP3, M4A, OGG, or WAV files to the single music folder, `public/music/`. The `predev` and `prebuild` scripts scan it and generate `src/lib/music-catalog.json`; restart the dev server after adding files. No external music is fetched. ID3/container title, artist, and embedded cover art are read when available; filenames provide a fallback. The player shows a small DG cover when artwork is absent.

Prefix filenames to assign playlists: `lobby--evening.mp3`, `blackjack--midnight.mp3`, `baccarat--track.mp3`, `ultimate--track.mp3`, `holdem--track.mp3`, or `omaha--track.mp3`. Files named `all--track.mp3` or without a recognized prefix play in every area. To change a playlist, rename or replace files in this folder and rebuild. The current track continues across routes if it belongs to both playlists; otherwise the player fades between tracks. Music and sound effects default on, with separate saved volume controls. Browsers may wait for the first user interaction before starting music.
