# Turso and local persistence

## Select the database explicitly

Both localhost and Vercel use `FLOPSTORAGE_TURSO_DATABASE_URL` and `FLOPSTORAGE_TURSO_AUTH_TOKEN` when present. They must appear together; URL must use `libsql://`. Never use `NEXT_PUBLIC_`, log their values, or commit them. On localhost, run `vercel env pull .env.local` after linking/logging into the intended Vercel project. Inspect **variable names only**, then restart Next. Ensure `DG_DATABASE_MODE=local` is absent when Turso variables are present.

For intentionally separate offline development, put `DG_DATABASE_MODE=local` in `.env.local`. This uses the existing `data/dgflops.sqlite`; the optional `DG_SQLITE_PATH` selects an isolated test file. Local mode is forbidden on Vercel. Missing or partial remote configuration never silently creates a fresh local database. Conflicting local/remote settings fail rather than choosing one.

The audited checkout had no `.env.local` and no Turso variables in its shell. It was reading SQLite, not `flopsdb`. This is a demonstrated explanation for apparently disappearing records when environments differ; no evidence of a remote drop was found. A local-only `.env.local` was explicitly added for verification, preserving its existing records. Replace it with the Vercel development variables to inspect `flopsdb`; remote data cannot be certified without those credentials. Do not merge local/remote snapshots by overwriting either one.

## Safe diagnostics and deployment

`npm run db:status` loads Next environment files and prints mode, a non-secret URL/path fingerprint, schema version, and record counts. Compare fingerprints between localhost and the admin dashboard on Vercel to verify the same target; different database tokens for the same URL still produce the same fingerprint. Production credentials are required at runtime, not during the frontend build.

In Vercel, attach the Turso integration to the intended project/environments and redeploy after variable changes. Use a **separate preview database** if test deployments should not affect production accounts. The integration's Development/Preview/Production checkboxes only control variable availability; they do not automatically create independent databases. Never rely on Vercel's filesystem or process memory for persistence.

## Initialization and forward migrations

Startup only creates `app_state` if absent and inserts row 1 if absent. There are no DROP, REPLACE, TRUNCATE, or automatic reset operations. Local legacy `data/dgflops.json` imports only into an empty default local store; the original file remains untouched. Malformed/future snapshots fail closed.

Migration **v2** is additive: optional user moderation/roles, room receipts/presence/departures/archive metadata, audit events, and settlement history. Older snapshots are decoded with empty defaults without removing unknown fields. `npm run db:migrate` runs the forward migration transaction, creates `schema_migrations` and `migration_backups`, retains the pre-migration snapshot under version 2, and records completion. Repeating it does not duplicate migration backups or erase data. Normal writes preserve these fields; compatible rollouts do not require a destructive table recreation.

Before schema work: verify fingerprint; take an independent Turso export/backup (or an SQLite backup made with its backup API while the app is stopped); run the migration on a copy; compare users, roles, ledger, history, room membership, and balances; then migrate the intended deployment. A backup in the same database is not disaster recovery. Do not copy only a live `.sqlite` file while its WAL is active.

Never run ad-hoc deletion/reset, overwrite `app_state`, import an empty seed, remove the configured SQLite directory, or recreate the Turso instance as a deployment step. There is no production seed/reset command. `scripts/preview-fixtures.ts` always creates a new OS-temporary database and never seeds the application's configured database. Test databases are not production backups.

## Verification

`tests/persistence.test.tsx` uses a new temporary SQLite file and tests account/ledger/history preservation through repeated migrations, an independent client reconnect, action retries, private access, queued leaves, archive refunds, last-admin protection, and moderation authorization. Production restart/remote behavior must also be verified against the intended environment; local tests do not prove Turso connectivity or recover previously removed remote records.
