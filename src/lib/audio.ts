type EffectName = "card" | "chip" | "win" | "lose";
let context: AudioContext | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let beat = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  context ||= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(frequency: number, duration: number, when = 0, volume = 0.08, shape: OscillatorType = "sine") {
  const ctx = audio();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = shape;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + when);
  gain.gain.setValueAtTime(0.001, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(ctx.currentTime + when);
  oscillator.stop(ctx.currentTime + when + duration + 0.02);
}

function noise(duration: number, cutoff: number, volume: number) {
  const ctx = audio();
  if (!ctx) return;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

export function playEffect(name: EffectName) {
  if (name === "card") { noise(0.16, 2800, 0.12); tone(330, 0.08, 0.03, 0.014); }
  else if (name === "chip") { tone(900, 0.07, 0, 0.04, "triangle"); tone(590, 0.12, 0.04, 0.03, "sine"); }
  else if (name === "win") { [440, 554, 659, 880].forEach((note, i) => tone(note, 0.55, i * 0.09, 0.045)); }
  else { tone(330, 0.22, 0, 0.045); tone(247, 0.35, 0.16, 0.04); }
}

export function setMusic(enabled: boolean) {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!enabled) return;
  audio();
  const notes = [110, 130.81, 146.83, 130.81, 98, 116.54, 130.81, 146.83];
  function pulse() {
    const note = notes[beat % notes.length];
    tone(note, 0.43, 0, 0.035, "triangle");
    if (beat % 4 === 0) { tone(note * 2, 1.9, 0, 0.015); tone(note * 3, 1.6, 0, 0.01); }
    if (beat % 2 === 0) noise(0.025, 700, 0.012);
    beat++;
  }
  pulse();
  musicTimer = setInterval(pulse, 560);
}
