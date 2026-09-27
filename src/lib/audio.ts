export type EffectName = "card" | "chip" | "win" | "lose";
let context: AudioContext | null = null;
let effectsVolume = 0.75;

export function setEffectsVolume(volume: number) { effectsVolume = Math.max(0, Math.min(1, volume)); }

function audio(): AudioContext | null {
  if (typeof window === "undefined" || effectsVolume === 0) return null;
  context ||= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function envelope(ctx: AudioContext, at: number, peak: number, attack: number, release: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * effectsVolume), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  gain.connect(ctx.destination);
  return gain;
}

function tone(ctx: AudioContext, frequency: number, at: number, duration: number, peak: number, type: OscillatorType = "sine") {
  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.88, at + duration);
  oscillator.connect(envelope(ctx, at, peak, 0.016, duration));
  oscillator.start(at);
  oscillator.stop(at + duration + 0.04);
}

function texture(ctx: AudioContext, at: number, duration: number, cutoff: number, peak: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(cutoff, at);
  lowpass.frequency.exponentialRampToValueAtTime(cutoff * 0.55, at + duration);
  source.connect(lowpass).connect(envelope(ctx, at, peak, 0.012, duration - 0.012));
  source.start(at);
  source.stop(at + duration + 0.02);
}

export function playEffect(name: EffectName) {
  const ctx = audio();
  if (!ctx) return;
  const at = ctx.currentTime + 0.005;
  if (name === "card") {
    // A paper-like slide followed by a soft landing, not a sharp click.
    texture(ctx, at, 0.19, 3400, 0.13);
    texture(ctx, at + 0.12, 0.1, 1100, 0.055);
    tone(ctx, 235, at + 0.13, 0.12, 0.018);
  } else if (name === "chip") {
    tone(ctx, 740, at, 0.19, 0.045, "triangle");
    tone(ctx, 1120, at + 0.025, 0.16, 0.026);
    tone(ctx, 530, at + 0.065, 0.24, 0.03, "triangle");
    texture(ctx, at, 0.12, 1600, 0.025);
  } else if (name === "win") {
    [392, 493.88, 587.33, 783.99].forEach((note, index) => tone(ctx, note, at + index * 0.11, 0.65, 0.04));
    tone(ctx, 196, at + 0.1, 0.8, 0.023, "triangle");
  } else {
    tone(ctx, 330, at, 0.42, 0.035, "triangle");
    tone(ctx, 246.94, at + 0.18, 0.55, 0.028);
  }
}
