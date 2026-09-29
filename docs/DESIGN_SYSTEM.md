# DG Flops — Aero Garden

## Direction and research

The redesign treats the casino as a bright, welcoming aquatic retreat: sky, water, living green, pearl hardware, and translucent game objects. It supersedes the earlier dark vaporwave direction. Authentic Frutiger Aero combines humanist typography, glossy physical metaphors, natural imagery, and optimistic consumer technology; a blue gradient alone is insufficient. References guide original work and are not copied into the application.

Research sources:

- [CARI: Frutiger Aero](https://cari.institute/aesthetics/frutiger-aero): mid-2000s to early-2010s context, humanist type, gloss, transparency, and nature imagery.
- [Microsoft: Aero icons](https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-icons): coherent top-left lighting, grounded objects, and simplified small control icons.
- [Microsoft: fonts](https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-fonts): readable humanist system typography.
- [Microsoft: animation](https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-animations): motion should explain changes, respond promptly, and settle naturally.
- [Microsoft: sound](https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-sound): soft edges, airy/glassy timbres, restrained repetition, and visual equivalents for feedback. Apply these principles to the web; Windows-specific APIs and audio-control rules do not apply.

## Materials and tokens

### Current gameplay refinement intent

Preserve Aero Garden and the existing music architecture. Refine playable tables with textured lagoon felt, acrylic rails, dealer origins, chip/bet zones, explicit turn/result states, and travel/flip motion driven only by authoritative snapshots. Desktop composition puts table and decisions together on the left and bounded, internally scrolling chat on the right; mobile flows naturally. New results include structured payout/net information rather than parsing display strings. Carousel wheel capture is restricted to actual game objects, swipe preserves vertical scrolling, and each object shares the launch callback. Theme options become a labeled acrylic menu with unchanged light/dark/system persistence.

Use deep ocean ink for text, sky/cyan for primary controls, leaf green for positive state and social presence, warm amber for chips and rewards, and coral for errors. Keep reading surfaces substantially opaque. Glass appears on surrounds and hardware, never behind dense low-contrast text. Consistent top-left highlights, narrow reflective rims, and restrained contact shadows establish depth. No purple gradients, black casino panels, wood rails, or pervasive neon.

The system font stack starts with Segoe UI, then humanist system fallbacks. Large headings use normal letter spacing and balanced line height; tabular numerals keep chips and scores stable. No external font request is required.

`src/styles/tokens.css` owns semantic colors, spacing, radii, elevation, typography, and motion values. `globals.css` imports small stylesheets for foundations, shared components, lobby/profile/ranking views, tables, and audio controls. Do not layer a replacement theme over legacy selectors; replace obsolete rules. Components may set documented CSS custom properties for object position, accent, and deal order.

## Shared UI and responsive layout

A persistent application shell provides a skip link, active navigation, account entry, footer, and interaction sound handling. Keep the existing AppProvider and music element intact. Use shared icons, accessible dialogs, empty/loading states, page intros, and reusable game objects. Dialogs must support Escape, focus containment and return, background dismissal, and scroll locking.

Desktop uses an airy centered layout up to 1440px. Lobby discovery retains real category and text filters around the object carousel. Below 960px, game decisions flow below the table; secondary chat always follows gameplay. Mobile reorganizes navigation and controls, uses two-column stats, and allows game objects to wrap without hiding critical values. Support 320px through wide desktop; primary controls target at least 44px. Reserve bottom space for the floating receiver and device safe areas.

## Game presentation and assets

All five games share an illuminated aqua table with pearl rails, inset card wells, clear betting areas, and glass/enamel chips. Each seat shows identity, turn/fold state, visible cards, and wager or stack. Dealer and private cards remain controlled by server responses. Empty card slots are visibly different from face-down dealt cards. Round/hand identity keys animations; polling must not redeal unchanged cards.

Reusable React/CSS/SVG assets include playing cards with mirrored indices, patterned card backs, chip stacks, dealer markers, and game illustrations. Use one consistent lighting model. Original environment imagery may support the lobby, but controls and game information stay real HTML. Game engines, API shapes, authentication, Turso persistence, and economy are unchanged.

## Motion and non-musical audio

Use short highlight/press transitions (120–180ms), window entry (220ms), and staggered card travel (about 450ms per card, overlapping). Animate transform/opacity, not layout or blur. Avoid endless decorative animation; reduced-motion disables travel and hover displacement. Results have text, icon, and restrained visual emphasis, including neutral pushes.

Sound effects form one original Web Audio family: airy card slides, rounded glass/enamel chip taps, quiet selection/navigation cues, and brief consonant result/confirmation tones. Limit overlap and repetition, clean up audio nodes, and honor the existing effects preference and volume. No sound is the only indicator. Never play feedback on hover or page polling alone without a meaningful state change.

**The existing playback system must not be modified.** Preserve tracks, catalog generation, AppProvider playback logic, playlist selection, looping, transitions, volume persistence, and autoplay behavior. The interface may be extended with shared controls; never add another audio element or playback state.

## Clear acrylic refinement specification

Extend Aero Garden, rather than replace it. Molded clear shells use double rims, inset reflections, translucent colored cores, contact shadows, and directional highlights. Reading surfaces retain enough opacity for contrast. Avoid animated blur, permanent GPU layers, and full-screen backdrop filters.

- Discovery becomes a manually operated object carousel: a central illuminated game sculpture with smaller objects receding to either side, a separate readable detail caption, explicit previous/next controls, and game selectors. Support swipe without blocking vertical scrolling, arrow/Home/End keys, focus, and reduced motion. Never auto-advance.
- The identity is a name-first, original outlined SVG `dgflops` wordmark: rounded connected strokes, a descending g, and a flowing waterline. Reuse `Wordmark` in navigation, footer, dialogs, and table branding. It scales without a font dependency or separate dominant emblem.
- Music has two views of `useApp`: a non-sticky, full-width top strip and a collapsible floating acrylic console. Hide/restore affects presentation only and is persisted independently. Both use the existing callbacks and current track; neither owns playback.
- Light (day garden), dark (moonlit lagoon), and system appearance share semantic surface, ink, rim, table, environment, and accent tokens. Persist the user's choice; system mode follows OS changes. Cards remain pearl objects in either environment.
- At desktop widths (960px+), a compact room header precedes a viewport-budgeted play workspace, targeting normal 720px+ laptop viewport heights. Table and decisions sit side-by-side; six-seat arrangements use two compact rows, the player's cards have extra emphasis, and long blackjack hands fan horizontally. Secondary chat moves below the workspace. Very short windows retain readable minimum dimensions rather than clipping the table. On mobile use a natural vertical layout, not a shrunken desktop.

Verification targets: all five games at 1280×720, 1366×768, and 1440×900; six-seat poker/house states and long blackjack hands; 320/390px mobile; both appearances; carousel keyboard/swipe; music hide/restore and shared controls. Browser availability must be reported, not inferred from a passing build.

## Implemented component boundaries

### Carousel showcase refinement (2026-09-29, pre-implementation)

Replace only the carousel's capsule artwork with original code-native miniature casino-table dioramas, inspired by the supplied floating-table reference. Use thick clear acrylic plinths, inset playing surfaces, upright translucent suit plaques, actual miniature cards/chips, and distinct game layouts. Keep surrounding objects fully colored and separated; emphasize the selected object with scale, elevation, and a bounded colored orbit/glow rather than fading its neighbors. No bitmap reproduction, new imagery dependency, or changes to playable tables.

The stage will accept normalized wheel/trackpad gestures, pointer drag/touch swipe, and Arrow/Home/End navigation. Horizontal gestures retain vertical page scrolling; wheel input is scoped to the stage, ignores pinch-zoom, and advances at a deliberate threshold with momentum protection. Selection remains shared with filters, selectors, caption, and launch action. Reduced motion removes travel and drag displacement.

The console will reserve fixed navigation columns and a fixed CTA column on desktop; narrow layouts put the CTA on its own full-width row. Caption height and name overflow must be stable across all five games. Verify in the live browser at desktop, laptop, tablet, and mobile sizes, including multiple selections, wheel axes, pointer/touch input, focus, reduced motion, and measured navigation-button rectangles.

- `tokens.css` owns both appearances, reading surfaces, table materials, acrylic rims, and game accents. `identity.css` supplies shared hardware treatments and wordmark sizing; `carousel.css` and `workspace.css` own their respective layouts.
- `GameCarousel` uses bounded CSS perspective transforms with no autoplay, animation library, drag loop, blur, or persistent `will-change`. Arrow/Home/End navigation moves focus to the newly selected object. Swipe distinguishes horizontal intent from vertical scrolling and suppresses the following synthetic click.
- `ThemeControl` persists `dg-appearance`; a small pre-paint initializer prevents a bright initial page in night mode. System changes are subscribed to, and unavailable storage falls back to the current session.
- `AudioDock.tsx` contains shared track, transport, and volume interfaces for `MusicBar` and `AudioDock`. The only audio element and playback callbacks remain in the unchanged `AppContext.tsx`. `dg-player-collapsed` is presentation-only. With no saved choice, room routes collapse the receiver; users can restore it at any time.
- `GameTable` remains a pure renderer of server-provided state. `GameControls` preserves action names and eligibility. `workspace.css` reserves space for the top bar and floating receiver instead of pushing decision buttons beneath a tall fixed table.

Automated checks and browser acceptance status are recorded in `UI_VERIFICATION.md`. Render tests establish control/card presence, not pixel geometry or successful user interaction.

## Accessibility, performance, and verification

Use native buttons/links/inputs, visible focus rings, labeled controls, semantic tables, aria-pressed selection, status announcements, and text alongside state colors. Decorative SVGs are hidden from assistive technology; card names are accessible. Avoid global opacity on disabled/locked content that reduces text contrast.

Keep gradients bounded, avoid full-screen blur and continuous GPU effects, use SVG/CSS for repeated objects, and optimize environment images. No new UI framework or animation dependency is needed. Verify lint, TypeScript, production build, route responses, all game states, responsive widths, dialogs, keyboard behavior, and reduced motion where tooling permits. Report any unavailable visual verification honestly. Audit the diff to confirm music and server/game logic remain intact.
