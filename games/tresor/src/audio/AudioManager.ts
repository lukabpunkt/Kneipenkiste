/**
 * Audio (GDD §6).
 *
 * **Die Platzhalter-Sounds werden zur Laufzeit synthetisiert** (Web Audio), nicht aus
 * Dateien geladen — ADR-19. Gruende: Die Toolchain hat keinen OGG/MP3-Encoder, die Cues
 * liegen dadurch exakt auf der Zeitachse der Show (Audit A3 fordert ± 50 ms Sound-Sync),
 * es kostet kein Byte Bundle und funktioniert offline ab dem ersten Start.
 *
 * Die oeffentliche API ist bewusst die, die ein howler-Sprite ebenfalls bedienen wuerde
 * (`play(cue)`, `startDrumroll`, `duckMusic`, …). In M6 tauscht man den Klangerzeuger
 * hinter dieser Fassade aus, ohne einen Aufrufer anzufassen.
 *
 * iOS erlaubt Audio erst nach einer echten Nutzergeste — `unlockAudio()` laeuft synchron
 * im ersten Tap.
 */

import { DRUMROLL, HEARTBEAT } from '@/config/choreo';

/** Alle Cues aus GDD §6. Nicht jeder klingt in M3 schon eigenstaendig. */
export type AudioCue =
  | 'ui_tap'
  | 'ui_confirm'
  | 'pass_whoosh'
  | 'card_seal'
  | 'vault_dial'
  | 'vault_open'
  | 'vault_close'
  | 'coin_shimmer'
  | 'drumroll'
  | 'card_lift'
  | 'card_flip'
  | 'card_stall'
  | 'reveal_share'
  | 'reveal_steal'
  | 'siren_short'
  | 'heartbeat'
  | 'crowd_aah'
  | 'crowd_gasp'
  | 'crowd_laugh'
  | 'tire_screech'
  | 'anvil'
  | 'brawl'
  | 'cash_register'
  | 'jackpot_choir'
  | 'thunder'
  | 'stamp';

interface CueSpec {
  /** Grundfrequenz in Hz. */
  freq: number;
  /** Zielfrequenz fuer einen Sweep; ohne Angabe konstant. */
  sweepTo?: number;
  durationMs: number;
  wave: OscillatorType;
  gain: number;
  /** Rauschanteil 0..1 — fuer Knall, Aufprall, Zischen. */
  noise?: number;
  /** Tiefpass in Hz. */
  lowpass?: number;
}

/**
 * Klangrezepte. Bewusst kurz und knackig: Party-Umgebung, kleiner Handy-Lautsprecher.
 * Die Heist-Cues sind tiefer und trockener als Drinkshots Arena-Sounds — ein Tresorraum
 * hallt nicht, er schluckt.
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
  card_seal: { freq: 180, sweepTo: 90, durationMs: 220, wave: 'sine', gain: 0.28, noise: 0.4, lowpass: 900 },

  vault_dial: { freq: 1400, durationMs: 26, wave: 'square', gain: 0.1 },
  vault_open: {
    freq: 140,
    sweepTo: 60,
    durationMs: 700,
    wave: 'sawtooth',
    gain: 0.24,
    noise: 0.3,
    lowpass: 800,
  },
  vault_close: {
    freq: 90,
    sweepTo: 45,
    durationMs: 380,
    wave: 'sawtooth',
    gain: 0.36,
    noise: 0.5,
    lowpass: 700,
  },
  coin_shimmer: { freq: 2100, sweepTo: 3200, durationMs: 320, wave: 'sine', gain: 0.12 },

  drumroll: { freq: 160, durationMs: 34, wave: 'triangle', gain: 0.11, noise: 0.8, lowpass: 1800 },
  card_lift: {
    freq: 380,
    sweepTo: 620,
    durationMs: 180,
    wave: 'sine',
    gain: 0.12,
    noise: 0.25,
    lowpass: 2400,
  },
  card_flip: {
    freq: 520,
    sweepTo: 300,
    durationMs: 130,
    wave: 'triangle',
    gain: 0.16,
    noise: 0.35,
    lowpass: 3000,
  },
  /** Das Stocken: ein trockener Tick, der die Drehung anhaelt. */
  card_stall: { freq: 900, durationMs: 40, wave: 'square', gain: 0.14 },

  reveal_share: { freq: 660, sweepTo: 990, durationMs: 260, wave: 'sine', gain: 0.2 },
  reveal_steal: {
    freq: 220,
    sweepTo: 110,
    durationMs: 300,
    wave: 'sawtooth',
    gain: 0.28,
    noise: 0.3,
    lowpass: 1400,
  },
  siren_short: { freq: 700, sweepTo: 1100, durationMs: 460, wave: 'sawtooth', gain: 0.2 },
  heartbeat: { freq: 110, sweepTo: 52, durationMs: 150, wave: 'sine', gain: 0.3, noise: 0.18, lowpass: 500 },

  crowd_aah: { freq: 300, sweepTo: 380, durationMs: 700, wave: 'sine', gain: 0.14, noise: 0.2, lowpass: 900 },
  crowd_gasp: {
    freq: 420,
    sweepTo: 260,
    durationMs: 420,
    wave: 'sine',
    gain: 0.16,
    noise: 0.45,
    lowpass: 1600,
  },
  crowd_laugh: {
    freq: 340,
    sweepTo: 300,
    durationMs: 620,
    wave: 'triangle',
    gain: 0.15,
    noise: 0.3,
    lowpass: 1400,
  },

  tire_screech: {
    freq: 1200,
    sweepTo: 700,
    durationMs: 620,
    wave: 'sawtooth',
    gain: 0.18,
    noise: 0.6,
    lowpass: 4000,
  },
  anvil: { freq: 240, sweepTo: 70, durationMs: 380, wave: 'square', gain: 0.34, noise: 0.4, lowpass: 2200 },
  brawl: {
    freq: 200,
    sweepTo: 180,
    durationMs: 900,
    wave: 'sawtooth',
    gain: 0.18,
    noise: 0.8,
    lowpass: 1800,
  },
  cash_register: { freq: 1320, sweepTo: 1760, durationMs: 240, wave: 'square', gain: 0.18 },
  jackpot_choir: { freq: 392, sweepTo: 784, durationMs: 1200, wave: 'sine', gain: 0.22 },
  thunder: { freq: 80, sweepTo: 36, durationMs: 900, wave: 'sawtooth', gain: 0.34, noise: 0.7, lowpass: 600 },
  stamp: { freq: 150, sweepTo: 70, durationMs: 180, wave: 'square', gain: 0.3, noise: 0.5, lowpass: 900 },
};

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  const scope = globalThis as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext;
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
  if (!value) {
    stopDrumroll();
    stopHeartbeat();
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

/**
 * Spielt einen Cue. `when` ist ein Offset in Sekunden auf der AudioContext-Uhr — so
 * lassen sich Ticks exakt vorplanen, statt sie im Frame-Loop zu triggern.
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
/* Trommelwirbel                                                       */
/* ------------------------------------------------------------------ */

let drumTimer: ReturnType<typeof setTimeout> | undefined;
let drumRate = DRUMROLL.rateStart;

/**
 * Trommelwirbel-Loop. Das Tempo steigt ueber die Show (GDD §4.5) — jeder Schlag plant
 * sich selbst neu, damit `setDrumrollRate()` sofort wirkt und nicht erst nach dem Zyklus.
 */
export function startDrumroll(rate = DRUMROLL.rateStart): void {
  stopDrumroll();
  drumRate = rate;

  const beat = (): void => {
    if (!ready()) {
      drumTimer = undefined;
      return;
    }
    play('drumroll');
    drumTimer = globalThis.setTimeout(beat, 70 / drumRate);
  };
  beat();
}

export function setDrumrollRate(rate: number): void {
  drumRate = Math.max(0.2, rate);
}

export function stopDrumroll(): void {
  if (drumTimer !== undefined) clearTimeout(drumTimer);
  drumTimer = undefined;
}

/* ------------------------------------------------------------------ */
/* Herzschlag (letzte Karte)                                           */
/* ------------------------------------------------------------------ */

let heartTimer: ReturnType<typeof setTimeout> | undefined;
let heartBpm: number = HEARTBEAT.bpm[0];

/** Herzschlag mit steigendem Tempo. Zwei Schlaege pro Zyklus — Lub-dub. */
export function startHeartbeat(bpm: number = HEARTBEAT.bpm[0]): void {
  stopHeartbeat();
  heartBpm = bpm;

  const beat = (): void => {
    if (!ready()) {
      heartTimer = undefined;
      return;
    }
    play('heartbeat');
    play('heartbeat', 0.16, -3);
    heartTimer = globalThis.setTimeout(beat, (60 / heartBpm) * 1000);
  };
  beat();
}

export function setHeartbeatBpm(bpm: number): void {
  heartBpm = Math.max(30, bpm);
}

export function stopHeartbeat(): void {
  if (heartTimer !== undefined) clearTimeout(heartTimer);
  heartTimer = undefined;
}

/* ------------------------------------------------------------------ */
/* Musik-Ducking                                                       */
/* ------------------------------------------------------------------ */

/** Senkt die Musik ab, damit der Herzschlag bei der letzten Karte traegt (GDD §4.3). */
export function duckMusic(to: number = HEARTBEAT.duckTo, ms: number = HEARTBEAT.duckMs): void {
  if (!context || !musicBus) return;
  musicBus.gain.setTargetAtTime(musicVolume * to, context.currentTime, ms / 3000);
}

export function unduckMusic(ms: number = HEARTBEAT.duckMs): void {
  if (!context || !musicBus) return;
  musicBus.gain.setTargetAtTime(musicVolume, context.currentTime, ms / 3000);
}

/** Pausiert alles (Tab-Wechsel). */
export function suspendAudio(): void {
  stopDrumroll();
  stopHeartbeat();
  void context?.suspend();
}

export function resumeAudio(): void {
  if (unlocked) void context?.resume();
}

/**
 * Zugang zum Klangapparat fuer `music.ts` (Roadmap M5.1).
 *
 * Die Musik braucht denselben Kontext und denselben Musik-Bus wie das Ducking — sonst
 * liefe sie am Herzschlag der letzten Karte vorbei. Sie liegt trotzdem in einer eigenen
 * Datei: Cues sind Einzelschuesse, Musik ist ein Scheduler, und beides in einer Datei
 * waere zweimal so schwer zu lesen. Gibt `undefined` zurueck, solange nichts entsperrt
 * oder der Ton aus ist — der Aufrufer laesst es dann einfach.
 */
export function musicNodes(): { ctx: AudioContext; bus: GainNode } | undefined {
  if (!ready() || !musicBus) return undefined;
  return { ctx: context!, bus: musicBus };
}

/** Testhilfe: alle Cue-Namen. */
export const AUDIO_CUES = Object.keys(CUES) as AudioCue[];
