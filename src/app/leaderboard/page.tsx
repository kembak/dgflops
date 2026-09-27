"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/AppContext";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, LoadingState, PageIntro } from "@/components/ui/PageElements";

type Leader = { username: string; xp: number; game_profit: number; wins: number; games_played: number };
type Ranking = { period: string; leaders: Leader[]; error: string };

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "all">("weekly");
  const [ranking, setRanking] = useState<Ranking | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try { const result = await api<{ leaders: Leader[] }>(`/api/leaderboard?period=${period}`); if (active) setRanking({ period, leaders: result.leaders, error: "" }); }
      catch (cause) { if (active) setRanking({ period, leaders: [], error: cause instanceof Error ? cause.message : "Could not load the leaderboard." }); }
    }
    void load();
    return () => { active = false; };
  }, [period]);
  const loading = ranking?.period !== period;
  const leaders = loading ? [] : ranking?.leaders || [];
  return <main id="main-content" className="leaderboard-page">
    <PageIntro eyebrow="GOOD COMPANY. A LITTLE FRIENDLY COMPETITION." title="Making waves." description="A great hand. A new achievement. See who's leaving their mark on the DG Flops community." icon="trophy" />
    <div className="ranking-toolbar"><div className="tabs" role="group" aria-label="Leaderboard period"><button aria-pressed={period === "weekly"} className={period === "weekly" ? "active" : ""} data-sound="select" onClick={() => setPeriod("weekly")}>This week</button><button aria-pressed={period === "all"} className={period === "all" ? "active" : ""} data-sound="select" onClick={() => setPeriod("all")}>All time</button></div><span className="muted">Game profit + achievement XP</span></div>
    {leaders.length > 0 && <div className="podium-grid">{leaders.slice(0, 3).map((player, index) => <div className={`panel podium-card podium-${index + 1}`} key={player.username}><span className="podium-medal"><Icon name="trophy" /><b>{index + 1}</b></span><div><span className="eyebrow">{index === 0 ? "LEADING THE WAY" : index === 1 ? "IN GOOD COMPANY" : "ON THE RISE"}</span><h2>{player.username}</h2><strong>{player.xp.toLocaleString()} <small>XP</small></strong></div></div>)}</div>}
    <section className="panel leaderboard-panel" aria-busy={loading}>
      {loading ? <LoadingState label="Finding this week's wave makers…" /> : ranking?.error ? <p className="form-error" role="alert">{ranking.error}</p> : leaders.length ? <div className="table-scroll"><table className="ranking-table"><caption className="sr-only">{period === "weekly" ? "Weekly" : "All-time"} leaderboard</caption><thead><tr><th scope="col">Rank / player</th><th scope="col">Rank XP</th><th scope="col">Game profit</th><th scope="col">Wins</th></tr></thead><tbody>{leaders.map((player, index) => <tr key={player.username}><th scope="row"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span>{player.username}</span></th><td><strong>{player.xp.toLocaleString()}</strong><small> XP</small></td><td className={player.game_profit >= 0 ? "positive" : "negative"}>{player.game_profit >= 0 ? "+" : ""}{player.game_profit.toLocaleString()}</td><td>{player.wins}</td></tr>)}</tbody></table></div> : <EmptyState icon="trophy" title="The first wave is yours to make."><p>Play a hand or earn an achievement to start the story.</p><Link href="/" className="primary-button">Find your game <Icon name="arrow" /></Link></EmptyState>}
    </section>
    <p className="info-note"><Icon name="info" /> Weekly ranking starts Monday at 00:00 UTC. Losses count toward XP; daily chip resets do not.</p>
  </main>;
}
