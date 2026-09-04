/**
 * Audio (GDD §6).
 *
 * Die Sounds werden **zur Laufzeit synthetisiert** (Web Audio), nicht aus Dateien
 * geladen — ADR-16. Drei Gründe: Die Toolchain hat keinen OGG/MP3-Encoder, die Cues
 * liegen dadurch exakt auf der Zeitachse der Sequenzen (Audit A3 fordert ± 50 ms), und
 * es kostet kein einziges Byte im Bundle.
 *
 * Die öffentliche API ist bewusst die, die ein howler-Sprite ebenfalls bedienen würde
 * (`play(cue, when)`, `startAmbience`, `duckMusic`, …). In M6 lässt sich der
 * Klangerzeuger hinter dieser Fassade austauschen, ohne einen Aufrufer anzufassen.
 *
 * iOS erlaubt Audio erst nach einer echten Nutzergeste — `unlockAudio()` läuft synchron
 * im ersten Tap. **Stumm ist das Spiel zu 100 % spielbar** (GDD §6).
 */

/** Alle Cues aus GDD §6. */
export type AudioCue =
  | 'ui_tap'
  | 'ui_confirm'
  | 'pass_whoosh'
  | 'zipper_close'
  | 'tag_clip'
  | 'belt_loop'
  | 'belt_stop'
  | 'hint_wobble'
  | 'hint_drip'
  | 'hint_heavy_creak'
  | 'hint_click'
  | 'hint_feather'
  | 'dog_sniff'
  | 'dog_bark'
  | 'timer_tick'
  | 'xray_powerup'
  | 'scanline_loop'
  | 'scan_stall'
  | 'alarm_burst'
  | 'siren_short'
  | 'whistle'
  | 'items_fountain'
  | 'duck_squeak'
  | 'stamp_ok'
  | 'stamp_busted'
  | 'crowd_aww'
  | 'crowd_laugh'
  | 'crowd_gasp'
  | 'record_scratch'
  | 'red_carpet'
  | 'moonwalk_sting'
  | 'confetti';

type Wave = OscillatorType;

interface CueSpec {
  /** Grundfrequenz in Hz. */
  freq: number;
  /** Zielfrequenz für einen Sweep; ohne Angabe konstant. */
  sweepTo?: number;
  durationMs: number;
  wave: Wave;
  gain: number;
  /** Rauschanteil 0…1 — für Knall, Zischen, Schnüffeln. */
  noise?: number;
  /** Tiefpass in Hz. */
  lowpass?: number;
  /** Mehrere Anschläge hintereinander (Ticken, Klatschen), Abstand in ms. */
  repeat?: { times: number; everyMs: number; detune?: number };
}

/**
 * Klangrezepte. Bewusst kurz und trocken: Partyumgebung, Handylautsprecher, und über
 * allem redet ein Tisch. Ein Sound, der länger als eine Sekunde braucht, um verstanden
 * zu werden, wird hier nie gehört.
 */
const CUES: Record<AudioCue, CueSpec> = {
  ui_tap: { freq: 660, durationMs: 45, wave: 'triangle', gain: 0.18 },
  ui_confirm: { freq: 520, sweepTo: 880, durationMs: 120, wave: 'triangle', gain: 0.22 },
  pass_whoosh: { freq: 300, sweepTo: 120, durationMs: 260, wave: 'sine', gain: 0.16, noise: 0.5, lowpass: 1200 },

  /* Koffer schließen: Reißverschluss und zwei Schnallen. */
  zipper_close: { freq: 1400, sweepTo: 600, durationMs: 260, wave: 'sawtooth', gain: 0.12, noise: 0.7, lowpass: 3500 },
  tag_clip: { freq: 1800, durationMs: 40, wave: 'square', gain: 0.14, repeat: { times: 2, everyMs: 110, detune: -3 } },

  /* Das Förderband. */
  belt_loop: { freq: 70, durationMs: 700, wave: 'sawtooth', gain: 0.07, noise: 0.35, lowpass: 420 },
  belt_stop: { freq: 90, sweepTo: 40, durationMs: 340, wave: 'sawtooth', gain: 0.12, lowpass: 500 },

  /* Die sechs Hinweise. Jeder muss in einer halben Sekunde erkennbar sein. */
  hint_wobble: { freq: 240, sweepTo: 300, durationMs: 320, wave: 'sine', gain: 0.16, lowpass: 900 },
  hint_drip: { freq: 1100, sweepTo: 380, durationMs: 180, wave: 'sine', gain: 0.2 },
  hint_heavy_creak: { freq: 120, sweepTo: 74, durationMs: 620, wave: 'sawtooth', gain: 0.17, noise: 0.2, lowpass: 600 },
  hint_click: { freq: 2000, durationMs: 26, wave: 'square', gain: 0.13, repeat: { times: 5, everyMs: 190 } },
  hint_feather: { freq: 3200, sweepTo: 5200, durationMs: 420, wave: 'sine', gain: 0.07, noise: 0.85, lowpass: 7000 },
  dog_sniff: { freq: 420, sweepTo: 700, durationMs: 150, wave: 'triangle', gain: 0.13, noise: 0.8, lowpass: 2400, repeat: { times: 3, everyMs: 190 } },
  dog_bark: { freq: 330, sweepTo: 180, durationMs: 130, wave: 'sawtooth', gain: 0.3, noise: 0.3, lowpass: 1800, repeat: { times: 2, everyMs: 200, detune: 2 } },

  timer_tick: { freq: 1300, durationMs: 24, wave: 'square', gain: 0.09 },

  /* Der Röntgen-Moment. */
  xray_powerup: { freq: 120, sweepTo: 900, durationMs: 420, wave: 'sawtooth', gain: 0.13, lowpass: 2600 },
  scanline_loop: { freq: 2400, durationMs: 1200, wave: 'sine', gain: 0.05, noise: 0.3, lowpass: 5200 },
  /* Das Stocken bei 50 %: ein kurzes Flackern, kein Ton. */
  scan_stall: { freq: 1600, sweepTo: 1900, durationMs: 70, wave: 'square', gain: 0.11, repeat: { times: 4, everyMs: 95 } },

  alarm_burst: { freq: 140, sweepTo: 60, durationMs: 340, wave: 'sawtooth', gain: 0.42, noise: 0.6, lowpass: 2400 },
  siren_short: { freq: 700, sweepTo: 1100, durationMs: 300, wave: 'sine', gain: 0.24, repeat: { times: 3, everyMs: 320 } },
  whistle: { freq: 2400, sweepTo: 2900, durationMs: 260, wave: 'sine', gain: 0.2, noise: 0.25, lowpass: 6000 },

  items_fountain: { freq: 500, sweepTo: 1400, durationMs: 260, wave: 'triangle', gain: 0.18, repeat: { times: 4, everyMs: 70, detune: 3 } },
  duck_squeak: { freq: 900, sweepTo: 1500, durationMs: 130, wave: 'square', gain: 0.2 },

  stamp_ok: { freq: 180, sweepTo: 90, durationMs: 130, wave: 'sine', gain: 0.3, noise: 0.5, lowpass: 900 },
  stamp_busted: { freq: 150, sweepTo: 70, durationMs: 170, wave: 'sawtooth', gain: 0.34, noise: 0.6, lowpass: 800 },

  /* Der Tisch reagiert mit. */
  crowd_aww: { freq: 300, sweepTo: 220, durationMs: 620, wave: 'sine', gain: 0.13, noise: 0.5, lowpass: 1100 },
  crowd_laugh: { freq: 260, sweepTo: 340, durationMs: 180, wave: 'triangle', gain: 0.15, noise: 0.6, lowpass: 1600, repeat: { times: 4, everyMs: 150, detune: 2 } },
  crowd_gasp: { freq: 420, sweepTo: 900, durationMs: 280, wave: 'sine', gain: 0.14, noise: 0.7, lowpass: 2200 },

  /* Diplomat: der Alarm bricht ab. */
  record_scratch: { freq: 900, sweepTo: 90, durationMs: 380, wave: 'sawtooth', gain: 0.26, noise: 0.4, lowpass: 2000 },
  red_carpet: { freq: 300, sweepTo: 600, durationMs: 700, wave: 'triangle', gain: 0.16, repeat: { times: 3, everyMs: 200, detune: 4 } },

  moonwalk_sting: { freq: 220, sweepTo: 440, durationMs: 200, wave: 'square', gain: 0.16, repeat: { times: 3, everyMs: 160, detune: 5 } },
  confetti: { freq: 1800, sweepTo: 3200, durationMs: 320, wave: 'triangle', gain: 0.12, noise: 0.5, lowpass: 6000 },
};

/* ------------------------------------------------------------------ */
/* Zustand                                                             */
/* ------------------------------------------------------------------ */

let context: AudioContext | undefined;
let master: GainNode | undefined;
let musicBus: GainNode | undefined;
let noiseBuffer: AudioBuffer | undefined;
let unlocked = false;
let enabled = true;
let musicVolume = 0.5;

function audioContextCtor(): typeof AudioContext | undefined {
  const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** Entsperrt den AudioContext. Muss synchron aus einem Nutzer-Event laufen (iOS). */
export function unlockAudio(): void {
  if (unlocked) return;
  const Ctor = audioContextCtor();
  if (!Ctor) return;

  try {
    context ??= new Ctor();
    master = context.createGain();
    master.gain.value = 1;
    master.connect(context.destination);

    musicBus = context.createGain();
    musicBus.gain.value = musicVolume;
    musicBus.connect(master);

    /* Ein Sekundenpuffer weißen Rauschens, den sich alle Cues teilen. */
    const frames = context.sampleRate;
    noiseBuffer = context.createBuffer(1, frames, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    void context.resume();
    unlocked = true;
  } catch {
    /* Kein Audio verfügbar — das Spiel ist stumm vollständig spielbar. */
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function setAudioEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    stopBelt();
    stopTicking();
  }
}

export function isAudioEnabled(): boolean {
  return enabled;
}

export function setMusicVolume(value: number): void {
  musicVolume = Math.min(1, Math.max(0, value));
  if (musicBus && context) musicBus.gain.setTargetAtTime(musicVolume, context.currentTime, 0.05);
}

function ready(): boolean {
  return enabled && unlocked && context !== undefined && master !== undefined;
}

/* ------------------------------------------------------------------ */
/* Cues                                                                */
/* ------------------------------------------------------------------ */

/**
 * Spielt einen Cue.
 *
 * `when` ist ein Offset in Sekunden auf der **AudioContext-Uhr**. Damit lassen sich
 * Ton-Cues exakt vorplanen, statt sie im Frame-Loop zu triggern — das ist der Grund,
 * warum die ± 50 ms aus Audit A3 überhaupt zu halten sind: Ein `setTimeout` im
 * Renderloop schwankt um mehr.
 */
export function play(cue: AudioCue, when = 0, detune = 0): void {
  if (!ready()) return;
  const spec = CUES[cue];
  const times = spec.repeat?.times ?? 1;

  for (let i = 0; i < times; i++) {
    const offset = when + (i * (spec.repeat?.everyMs ?? 0)) / 1000;
    voice(spec, offset, detune + i * (spec.repeat?.detune ?? 0));
  }
}

function voice(spec: CueSpec, when: number, detune: number): void {
  const ctx = context!;
  const start = ctx.currentTime + when;
  const duration = spec.durationMs / 1000;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(spec.gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  if (spec.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.lowpass, start);
    envelope.connect(filter);
    filter.connect(master!);
  } else {
    envelope.connect(master!);
  }

  const oscillator = ctx.createOscillator();
  oscillator.type = spec.wave;
  const semitone = Math.pow(2, detune / 12);
  oscillator.frequency.setValueAtTime(spec.freq * semitone, start);
  if (spec.sweepTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, spec.sweepTo * semitone),
      start + duration
    );
  }
  oscillator.connect(envelope);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);

  if (spec.noise && noiseBuffer) {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = spec.noise;
    source.connect(noiseGain);
    noiseGain.connect(envelope);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}

/* ------------------------------------------------------------------ */
/* Schleifen: Band und Uhr                                             */
/* ------------------------------------------------------------------ */

let beltTimer: ReturnType<typeof setTimeout> | undefined;

/** Das Förderband brummt, solange es läuft. */
export function startBelt(): void {
  stopBelt();
  const loop = (): void => {
    if (!ready()) return;
    play('belt_loop');
    beltTimer = globalThis.setTimeout(loop, 640);
  };
  loop();
}

export function stopBelt(): void {
  if (beltTimer !== undefined) clearTimeout(beltTimer);
  beltTimer = undefined;
  if (ready()) play('belt_stop');
}

let tickTimer: ReturnType<typeof setInterval> | undefined;

/**
 * Die Hallenuhr tickt in den letzten Sekunden des Verhörs mit.
 *
 * Nicht die ganze Zeit: Ein Ticken, das 45 Sekunden läuft, ist Hintergrundrauschen.
 * Erst wenn es knapp wird, wird es zum Druckmittel (GDD §3.3).
 */
export function startTicking(): void {
  stopTicking();
  tickTimer = globalThis.setInterval(() => play('timer_tick'), 1000);
}

export function stopTicking(): void {
  if (tickTimer !== undefined) clearInterval(tickTimer);
  tickTimer = undefined;
}

/* ------------------------------------------------------------------ */
/* Musik                                                               */
/* ------------------------------------------------------------------ */

/** Senkt die Musik ab, damit ein Moment trägt (Röntgen, Alarm). */
export function duckMusic(to = 0.35, ms = 220): void {
  if (!context || !musicBus) return;
  musicBus.gain.setTargetAtTime(musicVolume * to, context.currentTime, ms / 3000);
}

export function unduckMusic(ms = 320): void {
  if (!context || !musicBus) return;
  musicBus.gain.setTargetAtTime(musicVolume, context.currentTime, ms / 3000);
}

/** Pausiert alles (Tab-Wechsel). */
export function suspendAudio(): void {
  stopBelt();
  stopTicking();
  void context?.suspend();
}

export function resumeAudio(): void {
  if (unlocked) void context?.resume();
}

/** Testhilfe: alle Cue-Namen. */
export const AUDIO_CUES = Object.keys(CUES) as AudioCue[];

/** Testhilfe: das Rezept eines Cues. */
export function cueSpec(cue: AudioCue): Readonly<CueSpec> {
  return CUES[cue];
}
