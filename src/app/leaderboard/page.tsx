"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { api } from "@/components/AppContext";

type Leader = { username: string; xp: number; game_profit: number; wins: number; games_played: number };

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "all">("weekly");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try { const result = await api<{ leaders: Leader[] }>(`/api/leaderboard?period=${period}`); if (active) { setLeaders(result.leaders); setError(""); } }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Could not load leaderboard."); }
    }
    void load();
    return () => { active = false; };
  }, [period]);
  return <main className="shell"><SiteHeader /><section className="inner-hero"><p className="eyebrow">THE SOCIAL SCOREBOARD</p><h1>Make your <em>mark.</em></h1><p>Rank XP combines game profit and achievement XP. Losses count; daily chip resets do not.</p></section>
    <div className="tabs" role="group" aria-label="Leaderboard period"><button className={period === "weekly" ? "active" : ""} onClick={() => setPeriod("weekly")}>This week</button><button className={period === "all" ? "active" : ""} onClick={() => setPeriod("all")}>All time</button></div>
    <section className="panel leaderboard-panel"><div className="leaderboard-head"><span>RANK / PLAYER</span><span>RANK XP</span><span>GAME PROFIT</span><span>WINS</span></div>
      {error && <p className="form-error">{error}</p>}
      {leaders.length ? leaders.map((player, index) => <div className="leaderboard-row" key={player.username}><span><b>{String(index + 1).padStart(2, "0")}</b><strong>{player.username}</strong></span><strong>{player.xp.toLocaleString()} XP</strong><span className={player.game_profit >= 0 ? "positive" : "negative"}>{player.game_profit >= 0 ? "+" : ""}{player.game_profit.toLocaleString()}</span><span>{player.wins}</span></div>) : !error && <p className="empty-copy">No ranked players yet. A first hand can change that.</p>}
    </section><p className="fine-print">Weekly ranking starts Monday at 00:00 UTC. XP may be negative because game losses are included.</p></main>;
}
