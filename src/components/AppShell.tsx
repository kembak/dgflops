"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "./SiteHeader";
import { Icon } from "./ui/Icon";
import { playEffect } from "@/lib/audio";
import { MusicBar } from "./AudioDock";
import { Wordmark } from "./ui/Wordmark";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const inRoom = usePathname().startsWith("/room/");
  useEffect(() => {
    function feedback(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-sound]") : null;
      if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
      playEffect(target.dataset.sound === "navigate" ? "navigate" : "select");
    }
    document.addEventListener("click", feedback);
    return () => document.removeEventListener("click", feedback);
  }, []);
  return <div className={`app-environment ${inRoom ? "game-environment" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="shell"><SiteHeader /><MusicBar />{children}<footer className="site-footer"><Link className="footer-brand" href="/"><Wordmark compact /></Link><span><Icon name="leaf" /> Produsert av Harald-IT-lærer's ånd.</span><small>© {new Date().getFullYear()} · Ingen ekte penger</small></footer></div>
  </div>;
}
