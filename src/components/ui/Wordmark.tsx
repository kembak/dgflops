import { useId } from "react";

// Original outlined lettering: the g descender leads into a flowing waterline.
// Drawn as paths so the compact identity never depends on an installed font.
const lettering = "M42 8V52C42 72 8 72 8 51S42 28 42 49 M94 35V72Q94 87 70 87 M94 50C94 27 60 28 60 50S94 73 94 50 M120 66V22Q120 8 137 8 M109 34H138 M151 8V53Q151 66 162 66 M190 33C166 33 166 66 190 66S214 33 190 33 M226 83V35 M226 50C226 27 260 28 260 50S226 73 226 50 M301 36C278 23 267 44 287 50S310 73 277 64";
export function Wordmark({ compact = false }: { compact?: boolean }) {
  const id = useId();
  return <span className={`wordmark ${compact ? "wordmark-compact" : ""}`} role="img" aria-label="DG Flops"><svg viewBox="0 0 324 100" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wordmark-top)" /><stop offset=".35" stopColor="var(--wordmark-mid)" /><stop offset=".52" stopColor="var(--wordmark-bottom)" /><stop offset="1" stopColor="var(--wordmark-mid)" /></linearGradient></defs><g transform="translate(12 0) skewX(-6)" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={lettering} stroke="var(--sky-deep)" strokeWidth="12" /><path d={lettering} stroke={`url(#${id})`} strokeWidth="9" /><path d="M112 86C166 97 244 86 303 78" stroke="var(--sky)" strokeWidth="3" /><path d="M114 89C165 100 244 89 301 81" stroke="var(--rim)" strokeWidth="1.5" /></g></svg></span>;
}
