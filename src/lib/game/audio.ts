/**
 * Trap War game audio — Web Audio API.
 * Must unlock on a user gesture (Telegram / mobile autoplay policy).
 */

export type SfxKind =
  | "tap"
  | "buy"
  | "sell"
  | "travel"
  | "plant"
  | "raid"
  | "rank"
  | "warn"
  | "success";

const MUTE_KEY = "trapwar_audio_muted_v1";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambienceNodes: { stop: () => void } | null = null;
let unlocked = false;
let muted = readMuted();
let currentCity = "";
let unlockPromise: Promise<boolean> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeAudio(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ensureGraph(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.75;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Unlock audio after a tap. Returns true if running. */
export async function unlockAudio(): Promise<boolean> {
  if (unlockPromise) return unlockPromise;
  unlockPromise = (async () => {
    const c = ensureGraph();
    if (!c || !master) return false;
    try {
      if (c.state === "suspended") await c.resume();
    } catch {
      unlockPromise = null;
      return false;
    }
    // Silent buffer — iOS/Telegram often require an actual play() after resume
    try {
      const buf = c.createBuffer(1, 1, c.sampleRate);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = 0.001;
      src.connect(g);
      g.connect(master);
      src.start(0);
    } catch {
      /* ignore */
    }
    unlocked = c.state === "running";
    if (unlocked && !muted && currentCity) startAmbience(currentCity);
    emit();
    unlockPromise = null;
    return unlocked;
  })();
  return unlockPromise;
}

export function isAudioUnlocked(): boolean {
  return unlocked && Boolean(ctx && ctx.state === "running");
}

export function isAudioMuted(): boolean {
  return muted;
}

export function setAudioMuted(next: boolean): void {
  muted = next;
  writeMuted(next);
  const c = ensureGraph();
  if (master && c) {
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(next ? 0 : 0.75, c.currentTime);
  }
  if (next) stopAmbience();
  else if (unlocked && currentCity) startAmbience(currentCity);
  emit();
}

export function toggleAudioMuted(): boolean {
  setAudioMuted(!muted);
  return muted;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain = 0.2,
  when = 0,
  slideTo?: number,
) {
  const c = ensureGraph();
  if (!c || !master || muted || !unlocked) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + duration);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

function noiseBurst(duration: number, gain = 0.12, band = 900) {
  const c = ensureGraph();
  if (!c || !master || muted || !unlocked) return;
  const len = Math.max(1, Math.floor(c.sampleRate * duration));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = band;
  filter.Q.value = 0.6;
  const g = c.createGain();
  const t0 = c.currentTime;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + duration);
}

/** Play SFX — unlocks audio if needed (call from click handlers). */
export function playSfx(kind: SfxKind): void {
  if (muted) return;
  void unlockAudio().then((ok) => {
    if (!ok || muted) return;
    switch (kind) {
      case "tap":
        tone(620, 0.07, "sine", 0.12);
        break;
      case "buy":
        tone(200, 0.12, "triangle", 0.18);
        tone(300, 0.14, "sine", 0.14, 0.05);
        break;
      case "sell":
        tone(392, 0.12, "sine", 0.18);
        tone(523, 0.16, "triangle", 0.15, 0.07);
        tone(659, 0.18, "sine", 0.12, 0.14);
        break;
      case "travel":
        noiseBurst(0.28, 0.14, 1100);
        tone(200, 0.32, "sawtooth", 0.1, 0, 70);
        break;
      case "plant":
        tone(170, 0.16, "sine", 0.16);
        tone(250, 0.2, "triangle", 0.12, 0.08);
        break;
      case "raid":
        noiseBurst(0.4, 0.2, 350);
        tone(90, 0.35, "square", 0.14, 0, 45);
        break;
      case "rank":
        tone(392, 0.14, "sine", 0.18);
        tone(523, 0.16, "sine", 0.16, 0.1);
        tone(784, 0.24, "triangle", 0.14, 0.2);
        break;
      case "warn":
        tone(220, 0.14, "square", 0.14);
        tone(160, 0.16, "square", 0.12, 0.1);
        break;
      case "success":
        tone(440, 0.12, "sine", 0.15);
        tone(660, 0.18, "sine", 0.13, 0.08);
        break;
      default:
        break;
    }
  });
}

export function startAmbience(citySlugOrName: string): void {
  currentCity = citySlugOrName;
  if (muted || !unlocked) return;
  const c = ensureGraph();
  if (!c || !master || c.state !== "running") return;

  stopAmbience();

  const slug = citySlugOrName.toLowerCase().replace(/\s+/g, "-");
  const cityTune: Record<string, { base: number; filter: number; rate: number; noise: number }> = {
    compton: { base: 55, filter: 480, rate: 0.07, noise: 0.06 },
    inglewood: { base: 62, filter: 560, rate: 0.09, noise: 0.055 },
    "long-beach": { base: 48, filter: 720, rate: 0.05, noise: 0.05 },
    "south-central": { base: 44, filter: 380, rate: 0.11, noise: 0.07 },
    watts: { base: 70, filter: 960, rate: 0.13, noise: 0.065 },
    "east-la": { base: 58, filter: 640, rate: 0.08, noise: 0.055 },
  };
  const tune = cityTune[slug] || { base: 52, filter: 500, rate: 0.08, noise: 0.055 };

  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const nFilter = c.createBiquadFilter();
  nFilter.type = "lowpass";
  nFilter.frequency.value = tune.filter;
  const nGain = c.createGain();
  nGain.gain.value = tune.noise;

  const drone = c.createOscillator();
  drone.type = "sine";
  drone.frequency.value = tune.base;
  const dGain = c.createGain();
  dGain.gain.value = 0.07;
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = tune.rate;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 18;
  lfo.connect(lfoGain);
  lfoGain.connect(nFilter.frequency);

  noise.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(master);
  drone.connect(dGain);
  dGain.connect(master);
  noise.start();
  drone.start();
  lfo.start();

  ambienceNodes = {
    stop: () => {
      try {
        noise.stop();
        drone.stop();
        lfo.stop();
      } catch {
        /* already stopped */
      }
      try {
        noise.disconnect();
        drone.disconnect();
        lfo.disconnect();
        nFilter.disconnect();
        nGain.disconnect();
        dGain.disconnect();
        lfoGain.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}

export function stopAmbience(): void {
  if (ambienceNodes) {
    ambienceNodes.stop();
    ambienceNodes = null;
  }
}

export function setAmbienceCity(citySlugOrName: string): void {
  const next = citySlugOrName.toLowerCase().replace(/\s+/g, "-");
  if (currentCity === next && ambienceNodes) return;
  currentCity = next;
  if (!muted && unlocked) startAmbience(next);
}
