# DG Flops

DG Flops is a social, fun-play casino concept built with Next.js and TypeScript. Chips have no monetary value. The current repository is an application starter and design preview; games, accounts, chat, achievements, and multiplayer are specified in [the product brief](docs/PRODUCT.md) and are not implemented yet.

## Run locally

Use Node.js 20.9 or newer.

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

Import the repository into Vercel as a Next.js project. This starter does not need environment variables. Future authentication, data storage, and realtime services will require server-side credentials and documented configuration before those features can be deployed.

Contributor conventions are in [AGENTS.md](AGENTS.md).
