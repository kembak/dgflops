# DG Flops product brief

DG Flops is an entertainment-only casino with fake chips, live games with friends, and a playful progression system. There is no real-money value, deposit, withdrawal, or cash prize.

## Games and social play

- House table games: Ultimate Hold'em, blackjack, and baccarat. Human players can share live tables where the game allows it; no bot players.
- Poker: no-limit Texas Hold'em and pot-limit Omaha, with chip tables, private friend rooms, and initially simple single-table tournaments. Larger tournament formats may follow.
- Accounts use a username and password. Guests can play solo house games; an account is required for multiplayer, table chat, achievements, and leaderboards.
- Table chat is required. Room membership, private game state, wagers, and outcomes must be checked by the server.

## Chips, XP, and progression

- Every account receives 10,000 chips at the daily 00:00 UTC reset, regardless of its previous balance.
- Game profit and loss persist as a ledger across resets. Resets and chip awards are not game profit.
- Leaderboards offer weekly and all-time views. Rank XP is signed net chips won or lost in games plus achievement XP, so both wins and losses affect position.
- Achievements can award badges, chips, and XP. The precise catalog and reward amounts will be designed with the games; rewards must not be counted twice as game profit.

## Experience

- Use the Aero Garden direction in `DESIGN_SYSTEM.md`: clear acrylic objects, name-first outlined lettering, natural imagery, and humanist typography. Day-garden and moonlit-lagoon appearances share one system. A keyboard/touch-friendly object carousel replaces conventional game cards. Keep all primary desktop decisions visible beside the active table; mobile uses a dedicated flowing layout.
- Audio is part of the game feel: distinct, soft, natural sounds for dealing cards, moving chips, winning, and losing, plus separate lobby and table music. Give music and effects separate controls, and respect reduced motion and user audio preferences.
- Vaporwave and electronic house artists named during planning are references for mood. Use original or licensed tracks and sound effects that permit web use.

## Delivery boundaries

All five games have implementations, together with account, social, progression, and audio interfaces. The redesign preserves those rules and services; it does not certify every game edge case. Music tracks and playback architecture are unchanged. A non-sticky top strip and hideable floating receiver share the existing playback state and callbacks.
