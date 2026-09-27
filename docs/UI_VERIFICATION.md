# Aero Garden refinement verification

## Automated checks

- `npm test`: ten server-rendered presentation tests cover all five games, six seats, long blackjack hands, stage-dependent decisions, private-card backs, carousel filters/selection semantics, and both wordmark sizes.
- `npm run lint` and `npm run typecheck`: static checks.
- `npm run build`: production compilation and route generation; catalog generation retains the existing 12 tracks.
- `npm run start -- -p 3002`, then `npm run test:smoke`: read-only HTTP checks on lobby, profile, leaderboard, and the room route shell. Each response contains exactly one audio element, the top player, floating player/restore entry, and appearance selector. This does not create accounts or live rooms.
- Diff audit: game engines, server/API files, AppContext playback, music files, and catalog generator remain unchanged.

## Browser acceptance matrix — outstanding

The session's browser runtime reported no available browsers. No rendered screenshot, computed layout, touch interaction, or audio audition has been verified. Passing render tests and HTTP checks must not be reported as proof of viewport fit.

| Area | Check when a browser is available |
| --- | --- |
| All five games | At 1280×720, 1366×768, and 1440×900, start/advance a round. Confirm cards, pot/wager, turn status, and all legal primary actions fit without scrolling. Test six occupied seats and an expanded receiver. |
| Blackjack | Hit repeatedly; long hands retain every rank. Confirm Hit/Stand/Double stay beside the table. |
| Ultimate | Check through preflop/flop, then verify Play/Fold at the river. Confirm dealer, board, and own cards coexist. |
| Poker | Use two accounts, then six seats. Confirm Check/Call/Raise/Fold, all four Omaha hole cards, stacks, and community cards. |
| Baccarat | Confirm side selection, wager, Deal, both hands, outcome, and Next round. |
| Mobile | At 320 and 390px, swipe objects without obstructing vertical scroll; launch each game, operate controls, and check horizontal overflow. |
| Keyboard/motion | Tab through carousel; arrows/Home/End move selection and focus; Enter activates launch. Repeat with reduced motion; no auto-rotation or decorative looping. |
| Appearance | Check lobby, account dialogs, profile, leaderboard, and every game in Day/Night/Auto. Reload and change OS appearance; verify focus and readable translucent surfaces. |
| Audio interface | Play/pause/skip from each presentation and confirm the other reflects it. Hide/restore/reload without restarting playback; verify volume settings and autoplay recovery. |

Desktop layout uses a readable minimum at unusually short heights; mobile and zoomed layouts use normal vertical flow. The browser pass must confirm actual fit at the stated laptop targets before release sign-off.
