# Game, account, and operations architecture

## Authority and module boundaries

`src/lib/games/` contains card ranking, house payouts, and room engines. Engines mutate a supplied authoritative snapshot and return transfers/settlements; they never read React state or a database. `EngineInput` supplies a fixed shoe and clock for deterministic tests. Normal server play uses Node's cryptographic `randomInt` shuffle. Never accept a client shoe, result, wallet balance, or payout.

`src/lib/server/rooms.ts` authorizes membership, invokes engines, applies effects, and returns redacted views. `lifecycle.ts` owns timeouts, queued departures, escrow refunds, archival, and history. `store.ts` serializes writes through a libSQL write transaction: state changes, wallets, ledger entries, achievements, and action receipts commit together or roll back together.

Next route handlers in `src/app/api/` are the HTTP transport. Vercel does not host a persistent WebSocket process. Clients poll rooms every two seconds without overlapping requests; a 15-second server presence heartbeat avoids a write on every unchanged poll. Public games survive navigation/reload because their UUID, deck, memberships, turn, wagers, and chat live in the database. Lobby lists exclude archived/private rooms.

## Game and table lifecycle

House tables progress `betting → playing → finished → betting`; baccarat resolves its compulsory draw immediately on the server. Poker progresses `waiting → preflop → flop → turn → river → finished`; all-ins run out automatically when no meaningful betting remains. A sit-and-go reaches `complete` when one player retains chips; the prize is transferred once. Seats joining an active cash hand wait for the next deal. Tournaments lock entrants after starting.

Commands carry `actionId` and the viewed `version`. A transaction rejects stale versions and mismatched reuse; the latest 256 receipt identities per table make retries harmless. Older receipts fall back to version rejection. A newer response cannot be replaced by an older poll. Chat is bounded to the latest 50 visible messages and rate-limited per user/table; it has no financial effects.

Private invite codes admit accounts only. Solo tables admit their guest/owner only. Redacted views remove every shoe, hidden dealer/Ultimate cards, opponents' poker cards before showdown, and folded/uncontested opponents' cards even after settlement. Admin summaries do not include cards or room invite codes.

Turns expire after 60 seconds. The next authorized room read catches up overdue turns with bounded work: check if legal, otherwise fold (poker), stand (blackjack), or check/fold (Ultimate). No browser timer is authoritative. Without requests, a table is dormant, not deleted; elapsed turns recover on the next request. A dedicated scheduled worker is unnecessary for correctness but would be needed for immediate wall-clock activity on completely unobserved tables.

Leaving during betting refunds a pending house wager. Leaving a finished house round removes the seat immediately. Cash departures during hands are queued; forced-safe turns run and the remaining stack is returned after settlement. Tournament departure queues automatic safe play and retains the entry until completion, preventing prize-pool corruption. The interface explains that the user can navigate away immediately. A departing host transfers ownership when its seat is removed.

`Delete table` means close/archive, not erase records. Hosts may close between rounds; admins may void a stuck live round. Closing returns unresolved house stakes, cash stacks plus unresolved contributions, or unfinished tournament buy-ins. Finished payouts are never refunded twice. The closed marker blocks further actions and removes the table from discovery. Ledger/history and the archived snapshot remain. There is no destructive purge API.

## Supported rules

- **Blackjack:** six decks freshly shuffled each round, dealer stands on soft/hard 17, dealer natural checked before actions, 3:2 natural payout, double on the first two cards, split equal-valued pairs up to four hands, double after split, one card per split ace. Split 21 pays ordinary 1:1. No insurance, surrender, or side bets. Whole-chip fractional payouts round down.
- **Baccarat:** eight decks, alternating initial deal, aces worth one, standard Player/Banker third-card matrix, Player 1:1, Banker 0.95:1, Tie 8:1; Player/Banker push on ties. Commission fractions round down to whole chips.
- **Ultimate:** equal ante/blind; one Play wager of 3×/4× preflop, 2× flop, or 1× river; otherwise check then fold. Dealer qualifies with a pair. Blind wins follow straight 1:1, flush 3:2, full house 3:1, quads 10:1, straight flush 50:1, royal 500:1. No optional Trips/jackpot side bets.
- **Poker:** 10/20 blinds, 1,000-chip buy-in, no rake. Hold'em uses any best five; Omaha uses exactly two hole and three board cards. Side pots, all-ins, full-raise rights, cumulative short all-ins, heads-up position, board burns, and odd chips clockwise left of the button are handled in the engine. Cash rebuys require an empty stack between hands. Single-table tournaments use fixed blinds and winner-take-all prizes; no late registration or re-entry.

Rule references: [Poker TDA](https://www.pokertda.com/view-poker-tda-rules/), [MGM blackjack guide](https://www.mgmresorts.com/en/gamesense/guide-to-blackjack.html), [California DOJ baccarat rules](https://www.oag.ca.gov/sites/all/files/agweb/pdfs/gambling/bicycle-21st-cent-baccarat-rules.pdf) (drawing/card values, not its commission-free pay table), and [The Star Ultimate guide](https://www.star.com.au/sites/default/files/2024-08/tsgc_qld_gaming_guide_-_ultimate_texas_hold_em.pdf). The explicit variants above govern DG Flops, not every optional casino rule.

## Presentation and adding games

`GameTable` renders snapshots; `GameControls` exposes legal decisions but the server validates them again. `GameMotion` measures the visible deck and card destination for short staggered travel/reveal animations. Mounted card slots retain identity across hidden-card reveals. Structured settlements supply win/loss/push text, returned stake, net chips, highlights, and sound. Initial/reconnected snapshots do not replay settlement sounds or financial effects. Interrupted animations have no authority. Reduced motion suppresses movement.

Add rules and an engine under `src/lib/games/`, tests in `tests/`, catalog metadata in `game-catalog.ts`, then integrate authorization/redaction/effects and shared rendering/controls. Do not put outcomes in components or bypass the transactional effect boundary.

## Accounts, economy, and relationships

Users are keyed by UUID. Usernames are case-insensitively unique; passwords use per-user random salts and scrypt. Random session tokens are stored as SHA-256 hashes; cookies are HttpOnly, SameSite=Lax, Secure in production, and expire in 30 days. Suspended accounts cannot authenticate; suspension invalidates existing sessions. Guests do not earn persistent ranking/achievement entries.

Sessions reference users; rooms reference hosts and members; messages reference rooms/users; ledger and achievements reference users; settlement history references rooms and participants. These logical relationships live in the existing `app_state` snapshot, not duplicated SQL tables. Wallets reset to 10,000 at the first read/write after UTC midnight. Existing escrow remains attached to active games. Resets/grants are not game profit. Signed net results and achievement XP drive rankings; normal awards are idempotent per user/achievement.

## Administration

`/admin` uses `/api/admin`; every read and write rechecks an active non-guest `admin` role in the database. A hidden route is not authorization. The dashboard exposes safe database fingerprint/counts, accounts, roles, moderation state, table phase/turn/presence, leaderboard, recent settlements/ledger, and audit events. It never returns salts, password hashes, session tokens, cards, or database credentials.

Create the intended account normally, then an authorized operator runs `npm run admin:bootstrap -- ExactUsername` against the verified database. This only works when no active admin exists and records the bootstrap in the audit trail. Never make the first public registrant an administrator. Subsequent grants/revocations, suspension/restoration, chat mute/unmute, and safe table closure require an admin session, confirmation, and a reason. The final active admin cannot be removed/suspended. There is deliberately no arbitrary SQL, wallet editing, account purge, or ledger rewrite interface.

## Scaling boundary

The existing single-row snapshot is retained to avoid a risky data rewrite. It is suitable for a small friends-only deployment, not high-volume casino traffic. Writes serialize globally and history grows with use. A future normalized schema needs export/backup, explicit forward migration, verification of counts/balances, and a rollback-compatible deployment; never replace a parse failure with empty state.
