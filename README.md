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
