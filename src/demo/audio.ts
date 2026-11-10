const CUES = ["consequence", "dialogue", "door", "footstep_00", "footstep_01", "footstep_02", "footstep_03", "investigation", "invalid", "phone_close", "phone_open", "trade", "transition", "ui_select"] as const;
export type Cue = (typeof CUES)[number] | "footstep";

/** Kenney CC0 sound effects plus a generated night-city ambience. Starts after the first user gesture. */
export class Audio {
  private context?: AudioContext;
  private master?: GainNode;
  private readonly buffers = new Map<string, AudioBuffer>();
  private muted = false;
  private step = 0;

  async unlock(): Promise<void> {
    if (this.context) return;
    const context = new AudioContext();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(context.destination);
    await context.resume().catch(() => undefined);
    this.startAmbience();
    await Promise.all(CUES.map(async (cue) => {
      try {
        const response = await fetch(`/demo/assets/audio/${cue}.mp3`);
        this.buffers.set(cue, await context.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // A missing cue should never break the game.
      }
    }));
  }

  play(cue: Cue, volume = 0.7): void {
    if (!this.context || !this.master) return;
    const name = cue === "footstep" ? `footstep_0${this.step++ % 4}` : cue;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = cue === "footstep" ? 0.9 + Math.random() * 0.2 : 1;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start();
  }

  toggle(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    return !this.muted;
  }

  /** Low city rumble: filtered brown noise with a slow swell, plus a soft distant bass pulse. */
  private startAmbience(): void {
    const context = this.context!;
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[index] = last * 3.2;
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = context.createGain();
    gain.gain.value = 0.16;
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(gain.gain);
    noise.connect(filter).connect(gain).connect(this.master!);
    noise.start();
    lfo.start();

    const bass = context.createOscillator();
    bass.type = "sine";
    bass.frequency.value = 49;
    const bassGain = context.createGain();
    bassGain.gain.value = 0;
    bass.connect(bassGain).connect(this.master!);
    bass.start();
    const beat = () => {
      const now = context.currentTime;
      for (let hit = 0; hit < 8; hit++) {
        const t = now + hit * 0.5;
        bassGain.gain.setValueAtTime(0.0001, t);
        bassGain.gain.exponentialRampToValueAtTime(hit % 4 === 0 ? 0.06 : 0.025, t + 0.02);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      }
    };
    beat();
    setInterval(beat, 4000);
  }
}
