import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function PageIntro({ eyebrow, title, description, icon = "wave", children }: { eyebrow: string; title: string; description: string; icon?: IconName; children?: ReactNode }) {
  return <section className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p>{children}</div><span className="intro-orb" aria-hidden="true"><Icon name={icon} /></span></section>;
}

export function EmptyState({ icon = "cards", title, children }: { icon?: IconName; title: string; children: ReactNode }) {
  return <div className="empty-state"><span className="object-icon"><Icon name={icon} /></span><h3>{title}</h3><div>{children}</div></div>;
}

export function LoadingState({ label = "Getting things ready…" }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="loading-orb" aria-hidden="true" /><span>{label}</span></div>;
}
