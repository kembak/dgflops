import type { CSSProperties } from "react";

const paths = {
  home: "M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10",
  cards: "m5 4 11-2 3 17-11 2L5 4Zm-2 3L1 8l3 14 11-2M10 8l4 4-3 4-4-4 3-4Z",
  trophy: "M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4M12 14v5m-5 2h10m-8-2h6",
  leaf: "M20 3C8 1 2 9 6 15s15 1 14-12ZM4 21 16 8",
  users: "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m18 0v-3a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 1a4 4 0 0 1 0 7",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6",
  close: "m6 6 12 12M6 18 18 6",
  chip: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v3m0 14v3M2 12h3m14 0h3",
  lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v2",
  chat: "M3 3h18v14H9l-6 4V3Zm4 5h10M7 12h6",
  check: "m5 12 4 4L19 6",
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 8v7m0-11v1",
  wave: "M2 8c3-6 7 6 10 0s7 6 10 0M2 16c3-6 7 6 10 0s7 6 10 0",
  user: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3",
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, className = "", style }: { name: IconName; className?: string; style?: CSSProperties }) {
  return <svg className={`icon ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
