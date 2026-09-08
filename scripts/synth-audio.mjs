#!/usr/bin/env node
/**
 * Synthetisiert die Sound-Quellen aus GDD §6 als WAV.
 *
 * **Was das ist und was nicht.** Das sind aus Oszillatoren und Rauschen gerechnete
 * Cartoon-Geräusche, keine Aufnahmen. Sie klingen nach dem, was sie sind: nach Synthese.
 * Ihr Zweck ist, die Tonspur *vollständig und richtig verdrahtet* zu haben — Sprite-
 * Offsets, iOS-Entsperren, Stummschaltung, Sync zum Bruch. Echte Aufnahmen ersetzen sie
 * später Datei für Datei, ohne dass sich eine Zeile Code ändert.
 *
 * Kein ffmpeg, keine Abhängigkeit: PCM wird hier gerechnet und als WAV geschrieben.
 *
 * Aufruf: `npm run synth:audio`
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = 'audio-src';
const RATE = 22050;

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

const clamp = (v) => Math.max(-1, Math.min(1, v));

/** Deterministisches Rauschen — dieselbe Datei bei jedem Lauf. */
function makeNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 0x100000000) * 2 - 1;
  };
}

/** Hüllkurve: Anstieg, Halten, Abfall — alles in Sekunden. */
function envelope(t, duration, { attack = 0.005, release = 0.1 } = {}) {
  if (t < attack) return t / attack;
  const fromEnd = duration - t;
  if (fromEnd < release) return Math.max(0, fromEnd / release);
  return 1;
}

/** Ein Sinus mit gleitender Frequenz. */
function sweep(t, from, to, duration, curve = 1) {
  const p = Math.min(1, t / duration) ** curve;
  return from + (to - from) * p;
}

/**
 * Rendert einen Clip.
 *
 * `voice(t, ctx)` liefert eine Amplitude in [-1, 1]; `ctx` bringt Rauschen und Dauer mit.
 */
function render(duration, voice, seed = 1) {
  const length = Math.round(duration * RATE);
  const data = new Float32Array(length);
  const noise = makeNoise(seed);

  for (let i = 0; i < length; i += 1) {
    const t = i / RATE;
    data[i] = clamp(voice(t, { noise, duration, i }));
  }
  return data;
}

/** Float-Samples → 16-Bit-WAV. */
function toWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  /* Die Länge des data-Chunks. Ohne sie liest jeder Parser einen leeren Clip — und zwar
     ohne Fehler, weil die Datei sonst gültig ist. */
  buffer.writeUInt32LE(samples.length * 2, 40);

  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.round(clamp(samples[i]) * 32000), 44 + i * 2);
  }
  return buffer;
}

/* ------------------------------------------------------------------ */
/* Die Klänge (GDD §6)                                                 */
/* ------------------------------------------------------------------ */

const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
/** Sägezahn — hat Obertöne, klingt nach Holz und Blech statt nach Pfeifton. */
const saw = (t, f) => 2 * (((t * f) % 1) - 0.5);

const CLIPS = {
  ui_tap: () => render(0.07, (t, c) => sine(t, 880) * envelope(t, c.duration, { release: 0.05 }) * 0.35),

  ui_confirm: () =>
    render(0.24, (t, c) => {
      const f = t < 0.09 ? 660 : 990;
      return sine(t, f) * envelope(t, c.duration, { release: 0.12 }) * 0.35;
    }),

  pass_whoosh: () =>
    render(0.36, (t, c) => {
      /* Gefiltertes Rauschen, das durchs Bild zieht. */
      const band = Math.sin(2 * Math.PI * sweep(t, 240, 1400, c.duration) * t);
      return (c.noise() * 0.5 + band * 0.5) * envelope(t, c.duration, { attack: 0.08, release: 0.2 }) * 0.3;
    }, 7),

  plank_select: () => render(0.1, (t, c) => saw(t, 320) * envelope(t, c.duration, { release: 0.07 }) * 0.3),

  seal: () =>
    render(0.28, (t, c) => {
      const thud = sine(t, sweep(t, 180, 60, c.duration, 0.5)) * 0.7;
      return (thud + c.noise() * 0.2) * envelope(t, c.duration, { release: 0.16 }) * 0.45;
    }, 11),

  /** Windschleife: langsam atmendes, gefiltertes Rauschen. Nahtlos, weil sie loopt. */
  wind_loop: () =>
    render(4, (t, c) => {
      const breath = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 4);
      let value = 0;
      for (let k = 1; k <= 3; k += 1) value += c.noise() / k;
      return value * 0.16 * (0.4 + breath * 0.6);
    }, 23),

  vulture_screech: () =>
    render(0.5, (t, c) => {
      const cry = saw(t, sweep(t, 900, 380, c.duration, 0.6));
      const rasp = c.noise() * 0.35;
      return (cry * 0.6 + rasp) * envelope(t, c.duration, { attack: 0.01, release: 0.25 }) * 0.32;
    }, 31),

  vulture_laugh: () =>
    render(0.7, (t, c) => {
      /* Fünf kurze Stösse — Lachen ist Rhythmus, nicht Tonhöhe. */
      const beat = Math.floor(t / 0.13);
      const local = (t % 0.13) / 0.13;
      const gate = local < 0.55 ? 1 - local / 0.55 : 0;
      return saw(t, 420 - beat * 26) * gate * envelope(t, c.duration, { release: 0.2 }) * 0.28;
    }, 37),

  footsteps_run: () =>
    render(1.2, (t, c) => {
      const step = (t % 0.16) / 0.16;
      const gate = step < 0.2 ? 1 - step / 0.2 : 0;
      return (c.noise() * 0.6 + sine(t, 120) * 0.4) * gate * 0.3;
    }, 41),

  step_thud: () =>
    render(0.3, (t, c) => {
      const body = sine(t, sweep(t, 150, 45, c.duration, 0.4));
      return (body + c.noise() * 0.25) * envelope(t, c.duration, { release: 0.2 }) * 0.6;
    }, 43),

  rope_strain: () =>
    render(0.6, (t, c) => {
      const groan = saw(t, sweep(t, 90, 130, c.duration)) * 0.5;
      return (groan + c.noise() * 0.15) * envelope(t, c.duration, { attack: 0.1, release: 0.3 }) * 0.3;
    }, 47),

  plank_snap: () =>
    render(0.45, (t, c) => {
      /* Der Knack: harter Transient, dann splitterndes Rauschen. */
      const crack = t < 0.03 ? c.noise() : 0;
      const splinter = c.noise() * Math.exp(-t * 12) * 0.6;
      const body = sine(t, sweep(t, 260, 70, c.duration, 0.3)) * Math.exp(-t * 8);
      return (crack + splinter + body) * 0.55;
    }, 53),

  plank_crumble: () =>
    render(0.8, (t, c) => {
      const grain = c.noise() * (0.4 + 0.6 * Math.abs(Math.sin(2 * Math.PI * 9 * t)));
      return grain * envelope(t, c.duration, { attack: 0.05, release: 0.4 }) * 0.34;
    }, 59),

  whistle_fall: () =>
    render(0.9, (t, c) => sine(t, sweep(t, 1200, 220, c.duration, 1.5)) * envelope(t, c.duration, { release: 0.3 }) * 0.26),

  splash: () =>
    render(0.7, (t, c) => {
      const burst = c.noise() * Math.exp(-t * 6);
      const gulp = sine(t, sweep(t, 400, 90, 0.25, 0.5)) * Math.exp(-t * 9) * 0.5;
      return (burst + gulp) * 0.5;
    }, 61),

  rock_squash: () =>
    render(0.3, (t, c) => (sine(t, sweep(t, 200, 80, c.duration)) + c.noise() * 0.4) * envelope(t, c.duration, { release: 0.2 }) * 0.45, 67),

  hat_flutter: () =>
    render(0.6, (t, c) => c.noise() * (0.3 + 0.3 * Math.sin(2 * Math.PI * 7 * t)) * envelope(t, c.duration, { attack: 0.1, release: 0.3 }) * 0.18, 71),

  relief_exhale: () =>
    render(0.7, (t, c) => c.noise() * envelope(t, c.duration, { attack: 0.05, release: 0.45 }) * 0.22, 73),

  balloon_deflate: () =>
    render(0.8, (t, c) => {
      const squeal = saw(t, sweep(t, 700, 180, c.duration, 1.4));
      return (squeal * 0.5 + c.noise() * 0.3) * envelope(t, c.duration, { release: 0.35 }) * 0.24;
    }, 79),

  hammer_rhythm: () =>
    render(1.4, (t, c) => {
      const hit = (t % 0.35) / 0.35;
      const gate = hit < 0.12 ? 1 - hit / 0.12 : 0;
      return (sine(t, 180) * 0.6 + c.noise() * 0.5) * gate * 0.5;
    }, 83),

  wood_rot: () =>
    render(0.9, (t, c) => {
      const creak = saw(t, sweep(t, 70, 40, c.duration)) * 0.4;
      const crumbs = c.noise() * 0.3 * (t > 0.5 ? 1 : 0.2);
      return (creak + crumbs) * envelope(t, c.duration, { attack: 0.08, release: 0.4 }) * 0.3;
    }, 89),

  stamp: () =>
    render(0.26, (t, c) => {
      const slam = sine(t, sweep(t, 220, 60, 0.1, 0.4)) * Math.exp(-t * 14);
      return (slam + c.noise() * 0.4 * Math.exp(-t * 20)) * 0.6;
    }, 97),

  drum_deathzone: () =>
    render(1.6, (t, c) => {
      /* Vier Schläge, jeder lauter — eine Ansage, kein Rhythmus. */
      const beat = Math.floor(t / 0.4);
      const local = (t % 0.4) / 0.4;
      const gate = local < 0.25 ? 1 - local / 0.25 : 0;
      const amp = 0.35 + beat * 0.16;
      return (sine(t, 90 - beat * 6) + c.noise() * 0.3) * gate * amp;
    }, 101),

  crowd_gasp: () =>
    render(0.8, (t, c) => c.noise() * envelope(t, c.duration, { attack: 0.06, release: 0.4 }) * 0.24 * (1 + 0.4 * Math.sin(2 * Math.PI * 3 * t)), 103),

  crowd_laugh: () =>
    render(1.1, (t, c) => {
      const wobble = 0.5 + 0.5 * Math.sin(2 * Math.PI * 6.5 * t);
      return (c.noise() * 0.7 + saw(t, 200) * 0.2) * wobble * envelope(t, c.duration, { attack: 0.05, release: 0.5 }) * 0.24;
    }, 107),

  /* --- Musik: kurze Schleifen, absichtlich schlicht --- */

  music_lobby: () =>
    render(4, (t, c) => {
      /* Banjo-Wanderschritt: Grundton, Quinte, Oktave im Wechsel. */
      const notes = [196, 294, 392, 294];
      const note = notes[Math.floor(t / 0.5) % notes.length];
      const local = (t % 0.5) / 0.5;
      const pluck = Math.exp(-local * 6);
      return (saw(t, note) * 0.5 + sine(t, note * 2) * 0.2) * pluck * 0.2 + c.noise() * 0.01;
    }, 109),

  music_negotiation: () =>
    render(4, (t, c) => {
      /* Wind plus Ticken: Die Uhr läuft, und man hört es. */
      const tick = (t % 1) < 0.03 ? c.noise() * 0.5 : 0;
      const drone = sine(t, 110) * 0.12 + sine(t, 165) * 0.06;
      return (drone + tick) * 0.4;
    }, 113),

  music_step: () =>
    render(6, (t, c) => {
      /* Spannungs-Drone: steigt langsam, bis es kracht. */
      const rise = t / 6;
      const drone = sine(t, 70 + rise * 40) * 0.3 + sine(t, 105 + rise * 60) * 0.16;
      return (drone + c.noise() * 0.04) * (0.4 + rise * 0.6) * 0.4;
    }, 127),
};

/* Vier Knarr-Varianten aus einem Rezept — dieselbe Idee, andere Tonhöhe und Rauhigkeit. */
for (const [index, base] of [96, 120, 148, 176].entries()) {
  CLIPS[`creak_${index + 1}`] = () =>
    render(
      0.55,
      (t, c) => {
        /* Holz knarrt in Stufen, nicht gleitend — deshalb die Treppe im Ton. */
        const step = Math.floor(t * 14) / 14;
        const pitch = base * (1 + step * 0.35);
        const body = saw(t, pitch) * 0.35;
        const rasp = c.noise() * 0.18 * (0.4 + 0.6 * Math.sin(2 * Math.PI * 22 * t));
        return (body + rasp) * envelope(t, 0.55, { attack: 0.03, release: 0.28 }) * 0.34;
      },
      131 + index * 7
    );
}

/* ------------------------------------------------------------------ */

await mkdir(OUT_DIR, { recursive: true });

const names = Object.keys(CLIPS).sort();
let total = 0;
for (const name of names) {
  const samples = CLIPS[name]();
  await writeFile(path.join(OUT_DIR, `${name}.wav`), toWav(samples));
  total += samples.length / RATE;
}

console.log(`synth:audio — ${names.length} Clips, ${total.toFixed(1)} s bei ${RATE} Hz.`);
