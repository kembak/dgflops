"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { useApp } from "@/components/AppContext";

export default function ProfilePage() {
  const { user, progress, ready } = useApp();
  return <main className="shell"><SiteHeader /><section className="inner-hero"><p className="eyebrow">YOUR JOURNEY</p><h1>Every hand <em>counts.</em></h1><p>Keep the memories and the rank XP, even when your chips reset tomorrow.</p></section>
    {!ready ? <div className="panel">Loading your profile…</div> : !user || user.guest ? <div className="panel"><h2>Make it yours</h2><p>Create an account to earn achievements, chat, and appear on the leaderboard.</p><Link className="primary-button link-button" href="/">Explore the games</Link></div> : <>
      <div className="stat-grid"><div className="panel stat-card"><span>CHIPS TODAY</span><strong>◈ {user.chips.toLocaleString()}</strong></div><div className="panel stat-card"><span>RANK XP</span><strong>{progress?.xp.toLocaleString() || "0"}</strong></div><div className="panel stat-card"><span>GAMES FINISHED</span><strong>{user.gamesPlayed}</strong></div><div className="panel stat-card"><span>WINS</span><strong>{user.wins}</strong></div></div>
      <section className="profile-section"><div className="section-heading"><div><p className="eyebrow">COLLECT THE MOMENTS</p><h2>Achievements</h2></div></div>
        <div className="achievement-grid">{progress?.catalog.map((item) => { const earned = progress.earned.some((entry) => entry.id === item.id); return <article className={`panel achievement-card ${earned ? "earned" : ""}`} key={item.id}><span className="achievement-icon">{earned ? "✦" : "◇"}</span><h3>{item.title}</h3><p>{item.description}</p><small>+{item.xp} XP · ◈ {item.chips}</small><b>{earned ? "EARNED" : "LOCKED"}</b></article>; })}</div>
      </section>
      <section className="profile-section panel"><p className="eyebrow">YOUR STORY</p><h2>Recent activity</h2>{progress?.history.length ? progress.history.map((item, index) => <div className="activity-row" key={`${item.created_at}-${index}`}><span>{item.note}</span><span>{item.xp >= 0 ? "+" : ""}{item.xp} XP</span></div>) : <p className="empty-copy">Your first game will start the story.</p>}</section>
      <p className="fine-print">At 00:00 UTC, every account wallet resets to 10,000 chips. Achievements and game results remain.</p>
    </>}</main>;
}
