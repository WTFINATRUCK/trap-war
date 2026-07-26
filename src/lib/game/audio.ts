/**
 * Trap War game audio — Web Audio API (no external files).
 * Telegram / mobile: must unlock after a user gesture (tap).
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

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Call on first pointer/touch — required for autoplay policies */
export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* user denied / unsupported */
    }
  }
  unlocked = c.state === "running";
  if (unlocked && !muted && currentCity) {
    startAmbience(currentCity);
  }
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
  if (master && ctx) {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(next ? 0 : 0.55, t, 0.05);
  }
  if (next) {
    stopAmbience();
  } else if (unlocked && currentCity) {
    startAmbience(currentCity);
  }
}

export function toggleAudioMuted(): boolean {
  setAudioMuted(!muted);
  return muted;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain = 0.12,
  when = 0,
  slideTo?: number,
) {
  const c = getCtx();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(duration: number, gain = 0.08, band = 800) {
  const c = getCtx();
  if (!c || !master || muted) return;
  const len = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = band;
  filter.Q.value = 0.7;
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

export function playSfx(kind: SfxKind): void {
  if (muted) return;
  void unlockAudio().then(() => {
    switch (kind) {
      case "tap":
        tone(520, 0.06, "sine", 0.05);
        break;
      case "buy":
        tone(220, 0.1, "triangle", 0.1);
        tone(330, 0.12, "sine", 0.07, 0.05);
        break;
      case "sell":
        tone(392, 0.1, "sine", 0.1);
        tone(523, 0.14, "triangle", 0.09, 0.06);
        tone(659, 0.16, "sine", 0.06, 0.12);
        break;
      case "travel":
        noiseBurst(0.22, 0.06, 1200);
        tone(180, 0.28, "sawtooth", 0.04, 0, 60);
        break;
      case "plant":
        tone(180, 0.15, "sine", 0.08);
        tone(240, 0.18, "triangle", 0.06, 0.08);
        break;
      case "raid":
        noiseBurst(0.35, 0.14, 400);
        tone(90, 0.3, "square", 0.08, 0, 40);
        break;
      case "rank":
        tone(392, 0.12, "sine", 0.1);
        tone(523, 0.14, "sine", 0.09, 0.1);
        tone(784, 0.22, "triangle", 0.08, 0.2);
        break;
      case "warn":
        tone(200, 0.12, "square", 0.07);
        tone(160, 0.14, "square", 0.06, 0.1);
        break;
      case "success":
        tone(440, 0.1, "sine", 0.08);
        tone(660, 0.16, "sine", 0.07, 0.08);
        break;
      default:
        break;
    }
  });
}

/** City-colored ambience (filter + drone pitch shifts with location) */
export function startAmbience(citySlugOrName: string): void {
  currentCity = citySlugOrName;
  if (muted || !unlocked) return;
  const c = getCtx();
  if (!c || !master) return;
  if (c.state !== "running") return;

  stopAmbience();

  const slug = citySlugOrName.toLowerCase().replace(/\s+/g, "-");
  const cityTune: Record<string, { base: number; filter: number; rate: number }> = {
    compton: { base: 55, filter: 420, rate: 0.07 },
    inglewood: { base: 62, filter: 520, rate: 0.09 },
    "long-beach": { base: 48, filter: 680, rate: 0.05 },
    "south-central": { base: 44, filter: 360, rate: 0.11 },
    watts: { base: 70, filter: 900, rate: 0.13 },
    "east-la": { base: 58, filter: 600, rate: 0.08 },
  };
  const tune = cityTune[slug] || { base: 52, filter: 480, rate: 0.08 };

  // Soft noise bed
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const nFilter = c.createBiquadFilter();
  nFilter.type = "lowpass";
  nFilter.frequency.value = tune.filter;
  const nGain = c.createGain();
  nGain.gain.value = 0.028;

  // Low drone
  const drone = c.createOscillator();
  drone.type = "sine";
  drone.frequency.value = tune.base;
  const dGain = c.createGain();
  dGain.gain.value = 0.035;
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = tune.rate;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 12;
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
  if (currentCity === citySlugOrName && ambienceNodes) return;
  currentCity = citySlugOrName;
  if (!muted && unlocked) startAmbience(citySlugOrName);
}
