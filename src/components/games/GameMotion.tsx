"use client";

import { createContext, useContext, useLayoutEffect, useRef, type RefObject } from "react";

export const GameMotion = createContext(false);

export function useTableMotion(ref: RefObject<HTMLElement | null>, identity: string, kind: "card" | "chip", index = 0, back = false) {
  const enabled = useContext(GameMotion);
  const previous = useRef<{ identity: string; back: boolean } | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { identity, back };
    const element = ref.current;
    if (!enabled || !element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (before?.identity === identity && before.back === back) return;
    const table = element.closest(".casino-table");
    const destination = element.getBoundingClientRect();
    const payout = !!element.closest(".payout-chips");
    const origin = table?.querySelector(kind === "card" || payout ? ".table-deck" : ".seat-pod[data-self=true]")?.getBoundingClientRect();
    let animation: Animation;
    if (kind === "card" && before?.back && !back) {
      animation = element.animate([{ transform: "perspective(600px) rotateY(90deg)", opacity: .4 }, { transform: "perspective(600px) rotateY(0)", opacity: 1 }], { duration: 340, easing: "cubic-bezier(.2,.7,.2,1)" });
    } else {
      const x = origin ? origin.left + origin.width / 2 - destination.left - destination.width / 2 : 0;
      const y = (kind === "card" || payout) && origin ? origin.top - destination.top : 35;
      animation = element.animate([{ transform: `translate(${x}px, ${y}px) rotate(${kind === "card" ? -10 : 8}deg) scale(.82)`, opacity: 0 }, { opacity: 1, offset: .15 }, { transform: "translate(0, 0) rotate(0) scale(1)", opacity: 1 }], { duration: kind === "card" ? 470 : 380, delay: Math.min(index, 10) * 70, easing: "cubic-bezier(.17,.7,.22,1)", fill: "backwards" });
    }
    return () => animation.cancel();
  }, [identity, back, enabled, index, kind, ref]);
}
