export const games = [
  { id: "blackjack", name: "Blackjack", category: "TABLE GAME", tag: "THE CLASSIC", symbol: "21", accent: "sky", description: "A little instinct. A perfect 21.", detail: "Play against the dealer, with room for friends at the table." },
  { id: "ultimate", name: "Ultimate Hold'em", category: "TABLE GAME", tag: "TAKE ON THE DEALER", symbol: "A", accent: "lime", description: "Your hand. Your moment.", detail: "Build your best five-card hand and choose when to play." },
  { id: "baccarat", name: "Baccarat", category: "TABLE GAME", tag: "FIND YOUR SIDE", symbol: "9", accent: "aqua", description: "Simple choices. Beautiful suspense.", detail: "Back the player, the banker, or a rare tie." },
  { id: "holdem", name: "Texas Hold'em", category: "POKER", tag: "BETTER TOGETHER", symbol: "♠", accent: "amber", description: "Good friends. Great poker.", detail: "No-limit poker with real opponents, shared pots, and private rooms." },
  { id: "omaha", name: "Pot-Limit Omaha", category: "POKER", tag: "FOUR TIMES THE POSSIBILITY", symbol: "4", accent: "coral", description: "More cards. More possibilities.", detail: "Four hole cards, exactly two to use, and pot-limit action." },
] as const;

export type GameId = (typeof games)[number]["id"];
export const gameNames: Record<string, string> = Object.fromEntries(games.map((game) => [game.id, game.name]));
