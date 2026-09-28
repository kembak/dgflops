import { useId } from "react";
import type { GameId } from "@/lib/game-catalog";

function MiniCard({ x, y, rank = "A", suit = "♠", rotate = 0, back = false }: { x: number; y: number; rank?: string; suit?: string; rotate?: number; back?: boolean }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`}><rect x="1" y="3" width="25" height="34" rx="3" fill="#002f4566" /><rect width="25" height="34" rx="3" fill={back ? "#2289bc" : "#f4fcff"} stroke="#b8eaff" strokeWidth="1.2" />{back ? <><rect x="3" y="3" width="19" height="28" rx="2" fill="none" stroke="#ffffff90" /><text x="12" y="22" textAnchor="middle" fill="#fff" fontSize="15">♦</text></> : <g fill={suit === "♥" || suit === "♦" ? "#c34349" : "#13486a"} fontFamily="Georgia, serif"><text x="3" y="11" fontSize="9" fontWeight="bold">{rank}</text><text x="14" y="27" fontSize="17" textAnchor="middle">{suit}</text></g>}</g>;
}
function MiniChips({ x, y, color, count = 3 }: { x: number; y: number; color: string; count?: number }) {
  return <g transform={`translate(${x} ${y})`}>{Array.from({ length: count }, (_, i) => <g key={i} transform={`translate(0 ${-i * 4})`}><path d="M-10 0v4c0 7 20 7 20 0V0" fill={color} stroke="#16475a" strokeWidth=".5" /><ellipse rx="10" ry="4.5" fill={color} stroke="#e5ffff" strokeWidth="2" strokeDasharray="4 3" /><ellipse rx="5.5" ry="2.4" fill="none" stroke="#ffffffa0" strokeWidth=".8" /></g>)}</g>;
}

/** Decorative original SVG dioramas, isolated from live-table card rendering. */
export function CarouselTable({ game }: { game: GameId }) {
  const id = useId().replace(/:/g, "");
  const paint = (name: string) => `url(#${id}-${name})`;
  const poker = game === "holdem" || game === "omaha";
  return <svg className={`showcase-table showcase-${game}`} viewBox="0 0 320 285" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-acrylic`} x1="0" y1="0" x2="1" y2=".3"><stop stopColor="#f0ffff" stopOpacity=".9" /><stop offset=".13" stopColor="#29bfee" stopOpacity=".65" /><stop offset=".28" stopColor="#e7ffff" stopOpacity=".8" /><stop offset=".43" stopColor="#138ec7" stopOpacity=".5" /><stop offset=".59" stopColor="#e9ffff" stopOpacity=".95" /><stop offset=".77" stopColor="#43c7ef" stopOpacity=".5" /><stop offset="1" stopColor="#e4ffff" stopOpacity=".9" /></linearGradient>
      <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" /><stop offset=".3" stopColor="#bfefff" /><stop offset=".5" stopColor="#40859d" /><stop offset=".7" stopColor="#f0ffff" /><stop offset="1" stopColor="#78c5e3" /></linearGradient>
      <linearGradient id={`${id}-felt`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={poker ? "#176d78" : game === "ultimate" ? "#2c875c" : "#168777"} /><stop offset="1" stopColor="#054c54" /></linearGradient>
      <linearGradient id={`${id}-plaque`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffffffdd" /><stop offset=".24" stopColor="#96e8ff70" /><stop offset=".55" stopColor="#e4ffff20" /><stop offset=".82" stopColor="#61ceef60" /><stop offset="1" stopColor="#efffffdd" /></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#096c8e" stopOpacity=".25" /><stop offset="1" stopColor="#096c8e" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="160" cy="251" rx="136" ry="21" fill={paint("shadow")} />
    <g className="sculpture-plaque" transform={`translate(${game === "baccarat" ? 115 : 121} 22) rotate(${game === "omaha" ? 9 : -7} 45 65)`}>
      <rect x="3" y="4" width="86" height="115" rx="15" fill="#48bee42b" stroke="#78c5de" strokeWidth="2" /><rect width="86" height="115" rx="15" fill={paint("plaque")} stroke="#eaffff" strokeWidth="2.5" /><path d="M9 34V15q0-6 7-6h49" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M6 88 77 16M25 111 81 55" stroke="#ffffff50" strokeWidth="6" />
      <text x="43" y="77" fontSize={game === "blackjack" ? 39 : 54} fontFamily="Georgia, serif" textAnchor="middle" fill="#e8ffffcc" stroke="#fff" strokeWidth="1">{game === "blackjack" ? "21" : game === "ultimate" ? "♥" : game === "baccarat" ? "♣" : game === "holdem" ? "♠" : "♦"}</text>
    </g>
    <g className="sculpture-platform">
      <path d="M22 172v29c0 78 276 78 276 0v-29" fill={paint("acrylic")} stroke="#a8ecfc" strokeWidth="1.5" />
      <path d="M27 187v16m18-4v18m28-7v19m30-13v22m38-20v23m42-23v21m40-26v21m36-31v21m24-34v18" stroke="#e8ffff90" strokeWidth="3" />
      <ellipse cx="160" cy="199" rx="138" ry="50" fill="none" stroke="#e6ffffc0" strokeWidth="2" /><ellipse cx="160" cy="179" rx="139" ry="57" fill={paint("rim")} stroke="#eefeff" strokeWidth="2" />
      <ellipse cx="160" cy="172" rx="132" ry="51" fill="#1b4753" stroke="#e8ffff" strokeWidth="2" /><ellipse cx="160" cy="171" rx="124" ry="45" fill={paint("felt")} stroke="#d1e599" strokeWidth="2" />
      <path d="M43 156C72 112 228 119 268 145" fill="none" stroke="#f0ffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 206c46 34 194 39 240-1" fill="none" stroke="#fff" strokeWidth="2" />
    </g>
    {game === "baccarat" ? <>
      <path d="m160 140 0 62" stroke="#e7ffff80" strokeWidth="1" /><g transform="translate(0 47) scale(1 .7)"><MiniCard x={87} y={131} rank="9" suit="♥" rotate={-8} /><MiniCard x={115} y={135} rank="K" /><MiniCard x={182} y={135} rank="7" suit="♦" /><MiniCard x={210} y={130} rank="2" rotate={8} /></g>
      <text x="105" y="197" fill="#e4ffff" fontSize="10" fontWeight="700" textAnchor="middle">PLAYER</text><text x="209" y="197" fill="#e4ffff" fontSize="10" fontWeight="700" textAnchor="middle">BANKER</text>
    </> : <>
      <g transform="translate(0 57) scale(1 .68)">{Array.from({ length: poker || game === "ultimate" ? 5 : 3 }, (_, i) => <MiniCard key={i} x={poker || game === "ultimate" ? 91 + i * 28 : 119 + i * 27} y={136} rank={["A", "K", "7", "5", "9"][i]} suit={i % 2 ? "♥" : "♠"} rotate={game === "blackjack" ? (i - 1) * 12 : 0} />)}</g>
      {game === "blackjack" || game === "ultimate" ? <g fill="none" stroke="#e4ebb29c" strokeWidth="1">{[78,119,160,201,242].map((x, i) => <ellipse key={x} cx={x} cy={195 - Math.abs(i - 2) * 3} rx="13" ry="6" />)}</g> : <g transform="translate(134 191) scale(.66 .44)">{Array.from({ length: game === "omaha" ? 4 : 2 }, (_, i) => <MiniCard key={i} x={i * 22 - (game === "omaha" ? 20 : 0)} y={0} back rotate={(i - 1) * 6} />)}</g>}
      <text x="160" y="142" textAnchor="middle" fill="#e0faffbb" fontSize="6.5" letterSpacing="1.2">{game === "blackjack" ? "BLACKJACK PAYS 3:2" : game === "ultimate" ? "ANTE · BLIND · PLAY" : game === "omaha" ? "FOUR CARDS · POT LIMIT" : "NO LIMIT · GOOD COMPANY"}</text>
    </>}
    <MiniChips x={73} y={153} color="#128c9b" count={4} /><MiniChips x={96} y={145} color="#da6c66" count={3} /><MiniChips x={237} y={150} color="#2584c7" count={5} /><MiniChips x={259} y={159} color="#daae48" count={3} />
    {game === "baccarat" && <MiniChips x={160} y={140} color="#daae48" count={5} />}
    <g fill="#f3ffff99" stroke="#acdeed" strokeWidth="1"><circle cx="46" cy="93" r="9" /><circle cx="281" cy="87" r="6" /><circle cx="271" cy="227" r="8" /></g><g fill="#fff"><circle cx="43" cy="90" r="2.5" /><circle cx="279" cy="85" r="1.8" /><circle cx="268" cy="224" r="2" /></g>
  </svg>;
}
