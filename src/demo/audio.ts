const CUES = ["dialogue", "door", "footstep_00", "footstep_01", "footstep_02", "footstep_03", "investigation", "invalid", "trade"] as const;
/** Cues scored in code rather than sampled: the end-of-day moments need to sound musical, not like UI clicks. */
type ScoredCue = "nightfall" | "reveal" | "phone_open" | "phone_close" | "ui_select";
export type Cue = (typeof CUES)[number] | ScoredCue | "footstep";

/** Kenney CC0 sound effects plus a generated night-city ambience. Starts after the first user gesture. */
export class Audio {
  private context?: AudioContext;
  private master?: GainNode;
  private readonly buffers = new Map<string, AudioBuffer>();
  private muted = false;
  private step = 0;
  private echoBus?: AudioNode;

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
    if (cue === "nightfall") return this.nightfall(volume);
    if (cue === "reveal") return this.reveal(volume);
    if (cue === "phone_open") return this.phone(true, volume);
    if (cue === "phone_close") return this.phone(false, volume);
    if (cue === "ui_select") return this.tap(volume);
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

  /** Short echo bus so the scored cues sit in a space instead of sounding dry. */
  private echo(): AudioNode {
    const context = this.context!;
    if (this.echoBus) return this.echoBus;
    const input = context.createGain();
    const delay = context.createDelay(1);
    delay.delayTime.value = 0.32;
    const feedback = context.createGain();
    feedback.gain.value = 0.32;
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1800;
    const wet = context.createGain();
    wet.gain.value = 0.35;
    input.connect(delay).connect(tone).connect(feedback).connect(delay);
    tone.connect(wet).connect(this.master!);
    this.echoBus = input;
    return input;
  }

  /** One soft voice: a tone with a gentle attack and a long exponential tail. */
  private voice(frequency: number, start: number, attack: number, hold: number, release: number, level: number, type: OscillatorType, out: AudioNode): void {
    const context = this.context!;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + attack);
    gain.gain.setValueAtTime(level, start + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + attack + hold + release + 0.05);
  }

  /** End of day: a low 808 drop under a dark minor pad that swells and fades with the curtain. */
  private nightfall(volume: number): void {
    const context = this.context!;
    const now = context.currentTime + 0.02;
    const bus = context.createGain();
    bus.gain.value = volume;
    const warm = context.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.setValueAtTime(1400, now);
    warm.frequency.exponentialRampToValueAtTime(380, now + 3.2);
    bus.connect(warm).connect(this.master!);
    warm.connect(this.echo());

    // A minor add 9: A2, E3, C4, B4. Two slightly detuned layers keep it wide and soft.
    for (const [frequency, level] of [[110, 0.13], [164.81, 0.095], [261.63, 0.075], [493.88, 0.04]] as const) {
      this.voice(frequency, now, 0.6, 0.9, 2.2, level, "triangle", bus);
      this.voice(frequency * 1.004, now + 0.05, 0.7, 0.8, 2.2, level * 0.6, "sine", bus);
    }

    // 808 drop: sine pitch falls from A1 to E1 with a slow decay.
    const sub = context.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(55, now);
    sub.frequency.exponentialRampToValueAtTime(41.2, now + 1.4);
    const subGain = context.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.55 * volume, now + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    sub.connect(subGain).connect(this.master!);
    sub.start(now);
    sub.stop(now + 2.3);
  }

  /** Card reveal: two soft bell notes (E5 then B5) with an echo tail. */
  private reveal(volume: number): void {
    const context = this.context!;
    const now = context.currentTime + 0.02;
    const bus = context.createGain();
    bus.gain.value = volume;
    const soft = context.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 3200;
    bus.connect(soft).connect(this.master!);
    soft.connect(this.echo());
    for (const [frequency, offset] of [[659.25, 0], [987.77, 0.12]] as const) {
      this.voice(frequency, now + offset, 0.008, 0.02, 1.1, 0.15, "sine", bus);
      this.voice(frequency * 2, now + offset, 0.004, 0.0, 0.35, 0.03, "sine", bus);
    }
    this.voice(329.63, now, 0.02, 0.05, 0.9, 0.08, "triangle", bus);
  }

  /** Phone wake and sleep: a quiet haptic thump and two short glassy notes, rising to open and falling to close. */
  private phone(open: boolean, volume: number): void {
    const context = this.context!;
    const now = context.currentTime + 0.01;
    const bus = context.createGain();
    bus.gain.value = volume;
    const soft = context.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 4200;
    bus.connect(soft).connect(this.master!);

    const thump = context.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(open ? 150 : 120, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.08);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.18, now + 0.006);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    thump.connect(thumpGain).connect(bus);
    thump.start(now);
    thump.stop(now + 0.12);

    // Open: B5 then E6. Close: E6 then B5, quieter.
    const notes = open ? [987.77, 1318.51] : [1318.51, 987.77];
    const level = open ? 0.12 : 0.09;
    notes.forEach((frequency, index) => {
      const start = now + 0.015 + index * 0.06;
      this.voice(frequency, start, 0.004, 0.0, 0.16, level, "sine", bus);
      this.voice(frequency * 2, start, 0.003, 0.0, 0.05, level * 0.18, "sine", bus);
    });
  }

  /** Tab and button tap: a very short, soft tick. */
  private tap(volume: number): void {
    const context = this.context!;
    const now = context.currentTime + 0.005;
    const bus = context.createGain();
    bus.gain.value = volume;
    bus.connect(this.master!);
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1900, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    osc.connect(gain).connect(bus);
    osc.start(now);
    osc.stop(now + 0.06);
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
