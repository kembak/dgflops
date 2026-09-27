// Original, non-musical Aero effects. Music remains owned by AppProvider.
export type EffectName = "card" | "chip" | "win" | "lose" | "neutral" | "select" | "navigate" | "confirm" | "notify" | "error";
let context: AudioContext | null = null;
let master: GainNode | null = null;
let paperBuffer: AudioBuffer | null = null;
let effectsVolume = 0.75;
const lastPlayed = new Map<EffectName, number>();

export function setEffectsVolume(volume: number) {
  effectsVolume = Math.max(0, Math.min(1, volume));
  if (context && master) master.gain.setTargetAtTime(effectsVolume, context.currentTime, 0.025);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || effectsVolume === 0 || !window.AudioContext) return null;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = effectsVolume;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 5;
    master.connect(limiter).connect(context.destination);
    // One short, quiet reflection gives the whole family a common glass-room character.
    const reflection = context.createDelay(0.2);
    const wet = context.createGain();
    reflection.delayTime.value = 0.067;
    wet.gain.value = 0.12;
    master.connect(reflection).connect(wet).connect(limiter);
    paperBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.3), context.sampleRate);
    const data = paperBuffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) { previous = (previous + (Math.random() * 2 - 1) * 0.3) / 1.3; data[i] = previous; }
  }
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return context;
}

function envelope(ctx: AudioContext, at: number, peak: number, attack: number, duration: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  gain.connect(master!);
  return gain;
}

function glass(ctx: AudioContext, frequency: number, at: number, duration: number, peak: number, end = 1) {
  const oscillator = ctx.createOscillator();
  const gain = envelope(ctx, at, peak, 0.023, duration);
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * end, at + duration);
  oscillator.connect(gain);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

function air(ctx: AudioContext, at: number, duration: number, cutoff: number, peak: number) {
  const source = ctx.createBufferSource();
  source.buffer = paperBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(cutoff, at);
  filter.frequency.exponentialRampToValueAtTime(cutoff * 0.55, at + duration);
  filter.Q.value = 0.6;
  const gain = envelope(ctx, at, peak, 0.025, duration);
  source.connect(filter).connect(gain);
  source.start(at);
  source.stop(at + duration);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
}

export function playEffect(name: EffectName) {
  const ctx = audio();
  if (!ctx) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) || -1000) < (name === "card" ? 95 : 120)) return;
  lastPlayed.set(name, now);
  const at = ctx.currentTime + 0.004;
  if (name === "card") {
    air(ctx, at, 0.23, 2800, 0.23);
    glass(ctx, 620, at + 0.13, 0.13, 0.009, 0.95);
  } else if (name === "chip") {
    const pitch = 1 + (Math.random() - 0.5) * 0.05;
    glass(ctx, 910 * pitch, at, 0.26, 0.035);
    glass(ctx, 1450 * pitch, at + 0.025, 0.2, 0.012);
    glass(ctx, 700 * pitch, at + 0.07, 0.28, 0.022);
    air(ctx, at + 0.02, 0.12, 1500, 0.04);
  } else if (name === "win" || name === "confirm") {
    const level = name === "win" ? 1 : 0.55;
    glass(ctx, 660, at, 0.5, 0.028 * level);
    glass(ctx, 990, at + 0.075, 0.48, 0.025 * level);
    glass(ctx, 1320, at + 0.13, 0.45, 0.008 * level);
  } else if (name === "lose" || name === "error") {
    glass(ctx, 550, at, 0.35, 0.025, 0.91);
    glass(ctx, 735, at + 0.065, 0.3, 0.012, 0.95);
  } else if (name === "navigate") {
    air(ctx, at, 0.16, 1800, 0.075);
    glass(ctx, 840, at + 0.02, 0.21, 0.011, 1.12);
  } else if (name === "notify") {
    glass(ctx, 880, at, 0.35, 0.025);
    glass(ctx, 1174, at + 0.08, 0.32, 0.014);
  } else {
    glass(ctx, name === "neutral" ? 660 : 1050, at, name === "neutral" ? 0.3 : 0.14, 0.017);
    air(ctx, at, 0.1, 2200, 0.025);
  }
}
