"use client";

import { useEffect, useState } from "react";
import { api, useApp } from "@/components/AppContext";
import { Dialog } from "@/components/ui/Dialog";
import type { adminOverview } from "@/lib/server/admin";

type Overview = Awaited<ReturnType<typeof adminOverview>>;
export default function AdminPage() {
  const { user } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ action: string; targetId: string; label: string } | null>(null);
  async function load() { try { setData(await api<Overview>("/api/admin")); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load administration."); } }
  useEffect(() => { if (user?.role === "admin") void api<Overview>("/api/admin").then(setData).catch((cause: Error) => setError(cause.message)); }, [user?.role]);
  function confirm(action: string, targetId: string, label: string) { setReason(""); setPending({ action, targetId, label }); }
  return <main id="main-content" className="admin-page"><div className="section-heading"><div><p className="eyebrow">OPERATIONS · AUDITED ACCESS</p><h1>Club administration</h1></div>{data && <button className="secondary-button" onClick={() => void load()}>Refresh</button>}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {user?.role !== "admin" ? <div className="panel">Administrator access is required. Access is also checked on every server operation.</div> : data && <>
      <section className="panel"><h2>Database health</h2><p>{data.database.mode} · fingerprint <code>{data.database.fingerprint}</code> · snapshot v{data.database.schemaVersion}</p><p>{data.database.users} users · {data.database.rooms} tables · {data.database.ledger} ledger entries · {data.database.audit} audit events</p><p className="fine-print">Fingerprints identify environments without exposing connection strings. Local and Turso databases are independent.</p></section>
      <section className="panel"><h2>Accounts & permissions</h2><div className="admin-table-scroll"><table><thead><tr><th>Account</th><th>Role/status</th><th>Chips / games</th><th>Management</th></tr></thead><tbody>{data.users.map((account) => <tr key={account.id}><td>{account.username}<small>{account.id}</small></td><td>{account.role}{account.suspended && " · suspended"}{account.muted && " · muted"}</td><td>{account.chips.toLocaleString()} / {account.gamesPlayed}</td><td>{[
        [account.role === "admin" ? "revoke-admin" : "grant-admin", account.role === "admin" ? "Remove admin" : "Make admin"],
        [account.suspended ? "restore-user" : "suspend", account.suspended ? "Restore" : "Suspend"],
        [account.muted ? "unmute" : "mute", account.muted ? "Unmute" : "Mute chat"],
      ].map(([action, label]) => <button className="text-button" key={action} onClick={() => confirm(action, account.id, `${label}: ${account.username}`)}>{label}</button>)}</td></tr>)}</tbody></table></div></section>
      <section className="panel"><h2>Tables & active sessions</h2><p>Closing a live table voids its unresolved round and refunds escrow. Settled ledger/history stays intact. Tables are archived, never physically erased.</p><div className="admin-table-scroll"><table><thead><tr><th>Table</th><th>State</th><th>Membership / presence</th><th>Action</th></tr></thead><tbody>{data.rooms.map((room) => <tr key={room.id}><td>{room.game} · {room.mode}<small>{room.id} · {room.visibility}</small></td><td>{room.closedAt ? "Archived" : room.phase}<small>v{room.version} · turn {room.turn || "—"}</small></td><td>{room.players.map((player) => <div key={player.id}>{player.name}{player.leaving ? " · leaving" : ""}<small>{player.lastSeen ? `Seen ${new Date(player.lastSeen).toLocaleString()}` : "No heartbeat yet"}</small></div>)}</td><td>{!room.closedAt && <button className="secondary-button" onClick={() => confirm("close-table", room.id, `Close / resolve ${room.game} table`)}>Close safely</button>}</td></tr>)}</tbody></table></div></section>
      <section className="panel"><h2>Leaderboard</h2><div className="admin-table-scroll"><table><thead><tr><th>Player</th><th>XP</th><th>Game profit</th></tr></thead><tbody>{data.leaderboard.map((entry) => <tr key={entry.username}><td>{entry.username}</td><td>{entry.xp}</td><td>{entry.game_profit}</td></tr>)}</tbody></table></div></section>
      <section className="panel"><h2>Game & accounting history</h2><p>{data.history.length} recent settlement groups. Cards and credentials are intentionally excluded.</p><div className="admin-records">{data.records.map((record) => <p key={record.id}><strong>{record.note}</strong> · {record.chipsDelta >= 0 ? "+" : ""}{record.chipsDelta} chips · {record.xp} XP<small>{record.userId} · {new Date(record.createdAt).toLocaleString()}</small></p>)}</div></section>
      <section className="panel"><h2>Audit trail</h2><div className="admin-records">{data.audit.map((entry) => <p key={entry.id}><strong>{entry.action}</strong> · {entry.reason}<small>By {entry.actorId} → {entry.targetId} · {new Date(entry.createdAt).toLocaleString()}</small></p>)}</div></section>
    </>}
    {pending && <Dialog title={pending.label} eyebrow="CONFIRM PRIVILEGED OPERATION" onClose={() => { if (!busy) setPending(null); }}><p>This operation is recorded permanently in the audit trail. No account or accounting records will be deleted.</p><label>Reason<textarea value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} /></label><button className="primary-button" disabled={busy || reason.trim().length < 5} onClick={async () => { setBusy(true); setError(""); try { setData(await api<Overview>("/api/admin", { ...pending, reason })); setPending(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Operation failed."); } finally { setBusy(false); } }}>Confirm operation</button><button className="text-button" disabled={busy} onClick={() => setPending(null)}>Cancel</button></Dialog>}
  </main>;
}
