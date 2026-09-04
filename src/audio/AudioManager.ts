/**
 * Audio (GDD §6).
 *
 * **Die Sounds werden zur Laufzeit synthetisiert** (Web Audio), nicht aus Dateien
 * geladen — ADR-13. Vier Gruende, und der dritte ist der wichtigste:
 *
 * 1. Die Toolchain hat keinen OGG/MP3-Encoder; ein Sprite muesste von Hand gebaut werden.
 * 2. Es kostet kein Byte Bundle und funktioniert offline ab dem ersten Start.
 * 3. **Die Cues liegen exakt auf der Zeitachse.** `play(cue, when)` plant auf der
 *    AudioContext-Uhr vor, statt im Frame-Loop zu triggern — Audit A3 fordert ± 50 ms
 *    Sound-Sync, und eine Datei, die erst geladen und dann dekodiert wird, kann das nicht
 *    versprechen.
 * 4. Cartoon-Sounds sind ohnehin synthetisch: ein Zischen, ein Knall, ein Plopp.
 *
 * Die oeffentliche API ist die, die ein howler-Sprite genauso bedienen wuerde. Wer die
 * Sounds spaeter durch Aufnahmen ersetzt, tauscht den Klangerzeuger hinter dieser
 * Fassade aus, ohne einen Aufrufer anzufassen.
 *
 * iOS erlaubt Audio erst nach einer echten Nutzergeste — `unlockAudio()` laeuft synchron
 * im ersten Tap. **Stumm ist das Spiel zu 100 % spielbar** (GDD §6): Wenn hier gar
 * nichts geht, fehlt kein einziges Stueck Information.
 */

/** Alle Cues aus GDD §6. */
export type AudioCue =
  | 'ui_tap'
  | 'ui_confirm'
  | 'pass_whoosh'
  | 'mine_place'
  | 'plate_stomp'
  | 'shovel_dig'
  | 'plate_flip'
  | 'worm_squeak'
  | 'temp_hot'
  | 'temp_warm'
  | 'temp_cold'
  | 'fuse_click'
  | 'explosion_s'
  | 'explosion_m'
  | 'explosion_l'
  | 'helmet_bonk'
  | 'whistle_fall'
  | 'tree_rustle'
  | 'dud_pfff'
  | 'treasure_fanfare'
  | 'bottle_clink'
  | 'crowd_ooh'
  | 'crowd_laugh'
  | 'crowd_gasp'
  | 'confetti'
  | 'turn_tick';

type Wave = OscillatorType;

interface CueSpec {
  /** Grundfrequenz in Hz. */
  freq: number;
  /** Zielfrequenz fuer einen Sweep; ohne Angabe konstant. */
  sweepTo?: number;
  durationMs: number;
  wave: Wave;
  gain: number;
  /** Rauschanteil 0…1 — fuer Knall, Aufprall, Zischen, Erde. */
  noise?: number;
  /** Tiefpass in Hz. */
  lowpass?: number;
  /** Hochpass in Hz — macht aus Rauschen ein Zischen statt eines Rumpelns. */
  highpass?: number;
}

/**
 * Klangrezepte. Bewusst kurz und knackig: Party-Umgebung, kleiner Handy-Lautsprecher.
 *
 * Die drei Explosionsgroessen unterscheiden sich in Tiefe und Dauer, nicht nur in
 * Lautstaerke — ein Doppelstapel soll sich **schwerer** anfuehlen, nicht bloss lauter.
 */
const CUES: Record<AudioCue, CueSpec> = {
  ui_tap: { freq: 660, durationMs: 45, wave: 'triangle', gain: 0.18 },
  ui_confirm: { freq: 520, sweepTo: 880, durationMs: 120, wave: 'triangle', gain: 0.22 },
  pass_whoosh: {
    freq: 300,
    sweepTo: 120,
    durationMs: 260,
    wave: 'sine',
    gain: 0.16,
    noise: 0.5,
    lowpass: 1200,
  },

  /* --- Minenphase --- */
  // Erde rieselt: Rauschen mit Tiefpass, kaum Ton.
  mine_place: {
    freq: 200,
    sweepTo: 90,
    durationMs: 240,
    wave: 'sine',
    gain: 0.16,
    noise: 0.8,
    lowpass: 900,
  },
  // Die Platten stampfen sich fest.
  plate_stomp: {
    freq: 110,
    sweepTo: 55,
    durationMs: 180,
    wave: 'sine',
    gain: 0.3,
    noise: 0.35,
    lowpass: 600,
  },

  /* --- Grabung --- */
  shovel_dig: {
    freq: 260,
    sweepTo: 160,
    durationMs: 110,
    wave: 'triangle',
    gain: 0.2,
    noise: 0.6,
    lowpass: 1800,
  },
  plate_flip: { freq: 420, sweepTo: 260, durationMs: 160, wave: 'triangle', gain: 0.22, noise: 0.25 },
  worm_squeak: { freq: 700, sweepTo: 1200, durationMs: 130, wave: 'sine', gain: 0.14 },

  /*
   * Die Temperatur-Cues sind drei klar verschiedene Klangfarben, nicht drei Tonhoehen:
   * Zischen, Glocke, Klirren. Auf einem Handy-Lautsprecher in einer lauten Runde traegt
   * die Farbe weiter als die Hoehe — und das Icon sagt es ohnehin auch (Art Dir. §2).
   */
  temp_hot: { freq: 1400, durationMs: 320, wave: 'sine', gain: 0.1, noise: 0.9, highpass: 2000 },
  temp_warm: { freq: 880, sweepTo: 990, durationMs: 200, wave: 'sine', gain: 0.14 },
  temp_cold: { freq: 2100, sweepTo: 2600, durationMs: 240, wave: 'triangle', gain: 0.1 },

  /* --- Explosion --- */
  fuse_click: { freq: 1800, durationMs: 30, wave: 'square', gain: 0.12 },
  explosion_s: {
    freq: 120,
    sweepTo: 50,
    durationMs: 260,
    wave: 'sawtooth',
    gain: 0.4,
    noise: 0.9,
    lowpass: 2400,
  },
  explosion_m: {
    freq: 90,
    sweepTo: 38,
    durationMs: 380,
    wave: 'sawtooth',
    gain: 0.5,
    noise: 1,
    lowpass: 2000,
  },
  explosion_l: {
    freq: 66,
    sweepTo: 28,
    durationMs: 520,
    wave: 'sawtooth',
    gain: 0.55,
    noise: 1,
    lowpass: 1600,
  },
  helmet_bonk: { freq: 900, sweepTo: 520, durationMs: 140, wave: 'square', gain: 0.2 },
  // Der pfeifende Fall: hoch los, tief runter — der Klassiker.
  whistle_fall: { freq: 1500, sweepTo: 260, durationMs: 700, wave: 'sine', gain: 0.16 },
  tree_rustle: { freq: 600, durationMs: 420, wave: 'sine', gain: 0.1, noise: 1, highpass: 1200 },

  /* --- Blindgaenger: das ganze Ereignis ist dieses eine Geraeusch --- */
  dud_pfff: {
    freq: 420,
    sweepTo: 180,
    durationMs: 340,
    wave: 'sine',
    gain: 0.18,
    noise: 0.85,
    lowpass: 1400,
  },

  /* --- Kiste --- */
  treasure_fanfare: { freq: 523, sweepTo: 1047, durationMs: 620, wave: 'square', gain: 0.24 },
  bottle_clink: { freq: 2400, sweepTo: 2900, durationMs: 120, wave: 'triangle', gain: 0.14 },
  confetti: { freq: 1600, durationMs: 500, wave: 'sine', gain: 0.08, noise: 1, highpass: 1800 },

  /* --- Publikum --- */
  crowd_ooh: {
    freq: 300,
    sweepTo: 220,
    durationMs: 620,
    wave: 'sine',
    gain: 0.14,
    noise: 0.5,
    lowpass: 900,
  },
  crowd_laugh: {
    freq: 340,
    sweepTo: 420,
    durationMs: 700,
    wave: 'triangle',
    gain: 0.14,
    noise: 0.4,
    lowpass: 1400,
  },
  crowd_gasp: {
    freq: 480,
    sweepTo: 700,
    durationMs: 300,
    wave: 'sine',
    gain: 0.14,
    noise: 0.6,
    highpass: 500,
  },

  /** Ein Tick pro Zug — der Takt der Grabphase (GDD §6). */
  turn_tick: { freq: 1200, durationMs: 32, wave: 'square', gain: 0.08 },
};

/** Die drei Explosionsgroessen in einer Reihe — der Stapel waehlt daraus. */
export const EXPLOSION_CUES: readonly AudioCue[] = ['explosion_s', 'explosion_m', 'explosion_l'];

function audioContextCtor(): typeof AudioContext | undefined {
  return (
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

let context: AudioContext | undefined;
let master: GainNode | undefined;
let musicBus: GainNode | undefined;
let noiseBuffer: AudioBuffer | undefined;
let unlocked = false;
let enabled = true;
let musicVolume = 0.5;

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

    // Ein Sekundenpuffer weissen Rauschens, den sich alle Cues teilen.
    const frames = context.sampleRate;
    noiseBuffer = context.createBuffer(1, frames, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    void context.resume();
    unlocked = true;
  } catch {
    // Kein Audio verfuegbar — das Spiel ist stumm zu 100 % spielbar (GDD §6).
  }
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function setAudioEnabled(value: boolean): void {
  enabled = value;
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

/**
 * Spielt einen Cue. `when` ist ein Offset in Sekunden auf der AudioContext-Uhr — so
 * lassen sich Toene exakt vorplanen, statt sie im Frame-Loop zu triggern. Genau davon
 * haengt der Sound-Sync ab (Audit A3: ± 50 ms).
 *
 * `detune` in Halbtoenen: Drei Schaufelstoesse klingen dadurch nicht wie dreimal
 * derselbe Sound, sondern wie dreimal dieselbe Bewegung.
 */
export function play(cue: AudioCue, when = 0, detune = 0): void {
  if (!ready()) return;
  const ctx = context!;
  const spec = CUES[cue];
  const start = ctx.currentTime + when;
  const duration = spec.durationMs / 1000;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(spec.gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  // Filterkette: Der Ausgang haengt am Master, der Eingang bleibt die Huellkurve.
  let tail: AudioNode = envelope;
  if (spec.lowpass !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.lowpass, start);
    tail.connect(filter);
    tail = filter;
  }
  if (spec.highpass !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(spec.highpass, start);
    tail.connect(filter);
    tail = filter;
  }
  tail.connect(master!);

  const oscillator = ctx.createOscillator();
  oscillator.type = spec.wave;
  const freq = spec.freq * Math.pow(2, detune / 12);
  oscillator.frequency.setValueAtTime(freq, start);
  if (spec.sweepTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, spec.sweepTo * Math.pow(2, detune / 12)),
      start + duration
    );
  }
  oscillator.connect(envelope);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);

  if (spec.noise !== undefined && noiseBuffer) {
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

/** Pausiert alles (Tab-Wechsel). */
export function suspendAudio(): void {
  void context?.suspend();
}

export function resumeAudio(): void {
  if (unlocked) void context?.resume();
}

/* ------------------------------------------------------------------ */
/* Musik (GDD §6)                                                      */
/* ------------------------------------------------------------------ */

/**
 * Zwei Loops: `lobby` (Banjo, zupfend, gut gelaunt) und `dig` (leiser Spannungs-Loop).
 *
 * Auch die Musik wird synthetisiert (ADR-13) — als kleiner Step-Sequencer. Ein Loop ist
 * ein Raster aus Sechzehnteln; jeder Schritt nennt einen Halbton relativ zum Grundton
 * oder `null` fuer eine Pause.
 *
 * Der Dig-Loop ist bewusst **duenn**: Er soll unter den Gespraechen am Tisch liegen und
 * die Anticipation traegt ohnehin die Spannung. Wer ihn heraushoert, hat schon verloren.
 */
interface MusicTrack {
  bpm: number;
  /** Halbtoene ueber dem Grundton; `null` ist eine Pause. */
  steps: readonly (number | null)[];
  rootHz: number;
  wave: Wave;
  gain: number;
  /** Laenge eines Tons in Schritten. */
  hold: number;
}

const TRACKS: Record<MusicId, MusicTrack> = {
  /* Banjo: gezupfte Dreiklaenge, schnell, ein bisschen albern. */
  lobby: {
    bpm: 108,
    rootHz: 196,
    wave: 'triangle',
    gain: 0.16,
    hold: 0.9,
    steps: [0, 7, 12, 7, 4, 7, 12, 16, 0, 7, 12, 7, 9, 7, 4, 2],
  },
  /*
   * Grabung: ein wandernder Basston mit einer kleinen Sekunde darueber — das ist der
   * Ton, der nicht aufgeloest wird, und genau deshalb bleibt die Ruhe unruhig.
   */
  dig: {
    bpm: 84,
    rootHz: 98,
    wave: 'sine',
    gain: 0.12,
    hold: 3.4,
    steps: [0, null, null, null, 1, null, null, null, 0, null, null, null, -2, null, null, null],
  },
};

export type MusicId = 'lobby' | 'dig';

/** Wie weit im Voraus geplant wird — deutlich mehr als ein Frame dauert. */
const LOOKAHEAD_S = 0.4;
const SCHEDULER_MS = 120;

let currentTrack: MusicId | undefined;
let schedulerTimer: ReturnType<typeof setInterval> | undefined;
/** Naechster noch nicht geplanter Schritt, auf der AudioContext-Uhr. */
let nextStepTime = 0;
let nextStepIndex = 0;

function scheduleAhead(): void {
  const track = currentTrack ? TRACKS[currentTrack] : undefined;
  if (!track || !ready() || !musicBus) return;
  const ctx = context!;
  const stepDuration = 60 / track.bpm / 4;

  while (nextStepTime < ctx.currentTime + LOOKAHEAD_S) {
    const semitone = track.steps[nextStepIndex % track.steps.length];
    if (semitone !== null && semitone !== undefined) {
      playNote(track, track.rootHz * Math.pow(2, semitone / 12), nextStepTime, stepDuration * track.hold);
    }
    nextStepTime += stepDuration;
    nextStepIndex += 1;
  }
}

function playNote(track: MusicTrack, freq: number, at: number, duration: number): void {
  const ctx = context!;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(track.gain, at + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  envelope.connect(musicBus!);

  const oscillator = ctx.createOscillator();
  oscillator.type = track.wave;
  oscillator.frequency.setValueAtTime(freq, at);
  oscillator.connect(envelope);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

/**
 * Startet einen Loop. Laeuft derselbe schon, passiert nichts — sonst wuerde jeder
 * Screenwechsel den Takt neu setzen.
 *
 * Der Zusatz `schedulerTimer !== undefined` ist kein Detail: Vor dem ersten Tap ist
 * Audio auf iOS gesperrt, der Loop wird also nur **vorgemerkt**. Ohne diese Bedingung
 * haelt der Merker den zweiten Aufruf nach dem Entsperren fuer eine Wiederholung — und
 * es bliebe fuer den Rest des Abends still.
 */
export function startMusic(id: MusicId): void {
  if (currentTrack === id && schedulerTimer !== undefined) return;
  stopMusic();
  currentTrack = id;
  if (!ready()) return;
  nextStepTime = context!.currentTime + 0.05;
  nextStepIndex = 0;
  scheduleAhead();
  schedulerTimer = setInterval(scheduleAhead, SCHEDULER_MS);
}

export function stopMusic(): void {
  if (schedulerTimer !== undefined) clearInterval(schedulerTimer);
  schedulerTimer = undefined;
  currentTrack = undefined;
}

export function currentMusic(): MusicId | undefined {
  return currentTrack;
}

/**
 * Ein Tick pro Zug (GDD §6). Er sitzt im Wechsel des Turn-Banners und macht aus einer
 * Reihe von Zuegen einen Takt — man merkt, dass die Runde laeuft.
 */
export function tickTurn(): void {
  play('turn_tick');
}

/** Testhilfe: alle Cue-Namen. */
export const AUDIO_CUES = Object.keys(CUES) as AudioCue[];

/** Die Rezepte — der Test prueft daran, dass jeder Cue plausibel klingt. */
export function cueSpec(cue: AudioCue): Readonly<CueSpec> {
  return CUES[cue];
}
