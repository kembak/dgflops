"use client";

import Link from "next/link";
import { useApp } from "@/components/AppContext";
import { openAccount } from "@/components/SiteHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EmptyState, LoadingState, PageIntro } from "@/components/ui/PageElements";

const awardIcons: Record<string, IconName> = { first_hand: "cards", first_win: "trophy", regular: "leaf", high_roller: "chip", table_talk: "chat" };

export default function ProfilePage() {
  const { user, progress, ready } = useApp();
  return <main id="main-content" className="profile-page">
    <PageIntro eyebrow="LITTLE MOMENTS. LASTING MEMORIES." title="Your collection." description="Every hand has a story. Keep the achievements, collect the memories, and watch your journey grow." icon="leaf" />
    {!ready ? <div className="panel"><LoadingState label="Opening your collection…" /></div> : !user || user.guest ? <div className="panel"><EmptyState icon="user" title="A little space that's all yours."><p>Create an account to collect achievements, save your progress, and join your friends.</p><button className="primary-button" onClick={openAccount}>Your account <Icon name="arrow" /></button><Link className="text-button" href="/">Explore the games</Link></EmptyState></div> : <>
      <div className="profile-welcome"><span className="profile-avatar">{user.username[0].toUpperCase()}</span><div><p className="eyebrow">CLUB MEMBER</p><h2>{user.username}</h2></div><span className="status-badge"><Icon name="leaf" /> {progress?.earned.length || 0} / {progress?.catalog.length || 5} collected</span></div>
      <div className="stat-grid">{[
        { label: "Chips today", value: user.chips.toLocaleString(), icon: "chip" as const, accent: "amber" },
        { label: "Rank XP", value: progress?.xp.toLocaleString() || "0", icon: "trophy" as const, accent: "sky" },
        { label: "Hands played", value: user.gamesPlayed, icon: "cards" as const, accent: "aqua" },
        { label: "Wins", value: user.wins, icon: "leaf" as const, accent: "lime" },
      ].map((stat) => <div className="panel stat-card" key={stat.label} data-accent={stat.accent}><span className="object-icon"><Icon name={stat.icon} /></span><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
      <section className="profile-section"><div className="section-heading"><div><p className="eyebrow">SOMETHING TO REMEMBER</p><h2>Small wins. Big smiles.</h2></div><span className="muted">Achievements stay after your daily reset</span></div>
        <div className="achievement-grid">{progress?.catalog.map((item) => {
          const earned = progress.earned.some((entry) => entry.id === item.id);
          return <article className={`panel achievement-card ${earned ? "earned" : ""}`} key={item.id}><span className="achievement-medallion"><Icon name={awardIcons[item.id] || "trophy"} /></span><span className={`achievement-state ${earned ? "positive" : ""}`}><Icon name={earned ? "check" : "lock"} />{earned ? "Collected" : "To discover"}</span><h3>{item.title}</h3><p>{item.description}</p><div className="achievement-reward"><span>+{item.xp} XP</span><span><Icon name="chip" /> {item.chips}</span></div></article>;
        })}</div>
      </section>
      <section className="profile-section panel"><div className="panel-heading"><div><p className="eyebrow">YOUR RECENT MOMENTS</p><h2>The story so far.</h2></div><Icon name="wave" /></div>{progress?.history.length ? <ul className="activity-list">{progress.history.map((item, index) => <li className="activity-row" key={`${item.created_at}-${index}`}><span className="activity-icon"><Icon name={item.kind === "achievement" ? "trophy" : "cards"} /></span><span><strong>{item.note}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</time></span><b className={item.xp >= 0 ? "positive" : "negative"}>{item.xp >= 0 ? "+" : ""}{item.xp.toLocaleString()} XP</b></li>)}</ul> : <EmptyState title="Your first hand is a good place to start."><p>Play a game and your recent moments will appear here.</p><Link className="secondary-button" href="/">Find a game <Icon name="arrow" /></Link></EmptyState>}</section>
      <p className="info-note"><Icon name="info" /> Every account gets 10,000 chips at 00:00 UTC. Your achievements and game results stay.</p>
    </>}
  </main>;
}
