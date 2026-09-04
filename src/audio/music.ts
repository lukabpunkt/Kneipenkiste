/**
 * Musik-Loops (GDD §6, Roadmap M5.1).
 *
 * Drei Stimmungen, alle synthetisiert wie die Cues (ADR-19): ein gedaempfter Heist-Jazz
 * fuers Menue, eine tickende Uhr mit Bass fuer die Verhandlung, ein Spannungs-Drone fuer
 * die Aufdeckung. Kein Byte Bundle, offline ab dem ersten Start.
 *
 * **Warum ein Scheduler und kein `setInterval` mit `play()`:** Ein Timer im Hauptthread
 * ruckelt, sobald der Browser etwas anderes tut — und genau dann laeuft bei uns eine
 * PIXI-Show. Deshalb schaut ein grober Timer alle 90 ms nach und plant alles, was in den
 * naechsten 320 ms faellig ist, exakt auf der Audio-Uhr ein. Das Ergebnis haelt den Takt
 * auch dann, wenn der Bildschirm gerade 40 Konfetti-Schnipsel malt.
 *
 * Die Musik haengt am `musicBus` des AudioManagers, damit `duckMusic()` bei der letzten
 * Karte auch sie trifft. Ist der Ton aus oder nicht entsperrt, tut hier alles nichts.
 */

import { MUSIC } from '@/config/choreo';
import { musicNodes } from './AudioManager';

export type MusicTrack = 'lobby' | 'negotiation' | 'reveal';

/** Ein Schritt im Sechzehntel-Raster: Was klingt, wie hoch, wie laut, wie lang. */
interface Step {
  /** Frequenz in Hz. `0` heisst Pause. */
  freq: number;
  wave: OscillatorType;
  gain: number;
  /** Laenge in Schritten. */
  length: number;
  /** Tiefpass in Hz — hier sitzt der ganze "gedaempft"-Charakter. */
  lowpass?: number;
  /** Rauschanteil, fuer Besen und Uhrticks. */
  noise?: number;
}

const R: Step = { freq: 0, wave: 'sine', gain: 0, length: 1 };

/* Tonvorrat: eine Moll-Tonleiter reicht fuer alle drei Loops. */
const HZ = {
  c2: 65.41, e2: 77.78, g2: 98.0, a2: 110.0, b2: 123.47,
  c3: 130.81, d3: 146.83, e3: 155.56, f3: 174.61, g3: 196.0, a3: 220.0,
  c4: 261.63, e4: 311.13, g4: 392.0, a4: 440.0,
} as const;

const bass = (freq: number, length = 2): Step => ({ freq, wave: 'triangle', gain: 0.5, length, lowpass: 420 });
const stab = (freq: number, gain = 0.22): Step => ({ freq, wave: 'sawtooth', gain, length: 1, lowpass: 1400 });
const brush: Step = { freq: 2400, wave: 'sine', gain: 0.05, length: 1, noise: 0.9, lowpass: 6000 };
const tick: Step = { freq: 1800, wave: 'square', gain: 0.12, length: 1, noise: 0.35, lowpass: 5200 };

/**
 * Die drei Loops als Sechzehntel-Raster.
 *
 * `lobby` ist ein schleichender Walking-Bass mit Besen — Heist-Jazz im Fahrstuhlformat.
 * `negotiation` ist die Uhr: Tick auf jeder Zaehlzeit, darunter ein Bass, der nicht
 * aufloest. `reveal` ist ein Drone aus zwei Quinten, der sich nie entscheidet.
 */
const TRACKS: Record<MusicTrack, Step[][]> = {
  lobby: [
    [bass(HZ.a2), R, brush, R, bass(HZ.c3), R, brush, R, bass(HZ.e3), R, brush, R, bass(HZ.d3), R, brush, R],
    [R, stab(HZ.a3, 0.14), R, R, R, stab(HZ.c4, 0.12), R, R, R, stab(HZ.e4, 0.14), R, R, R, R, stab(HZ.d3, 0.1), R],
  ],
  negotiation: [
    [bass(HZ.a2, 4), R, R, R, bass(HZ.g2, 4), R, R, R, bass(HZ.f3, 4), R, R, R, bass(HZ.e2, 4), R, R, R],
    [tick, R, R, R, tick, R, R, R, tick, R, R, R, tick, R, R, R],
  ],
  reveal: [
    [{ freq: HZ.c2, wave: 'sawtooth', gain: 0.34, length: 16, lowpass: 260 }, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
    [R, R, R, R, { freq: HZ.g3, wave: 'sine', gain: 0.1, length: 8, lowpass: 900 }, R, R, R, R, R, R, R, R, R, R, R],
  ],
};

/* ------------------------------------------------------------------ */

let timer: ReturnType<typeof setInterval> | undefined;
let current: MusicTrack | undefined;
let trackGain: GainNode | undefined;
let intensity = 0;
/** Naechster einzuplanender Schritt, als Zeitpunkt auf der Audio-Uhr. */
let nextStepAt = 0;
let step = 0;

function stepSeconds(track: MusicTrack): number {
  const spec = MUSIC[track];
  return (spec.stepMs + (spec.stepMsFast - spec.stepMs) * intensity) / 1000;
}

/** Plant eine einzelne Note auf der Audio-Uhr ein. */
function schedule(ctx: AudioContext, target: GainNode, note: Step, at: number, stepSec: number): void {
  if (note.freq <= 0 || note.gain <= 0) return;
  const duration = Math.max(0.05, note.length * stepSec * 0.9);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(note.gain, at + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  let tail: AudioNode = envelope;
  if (note.lowpass !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(note.lowpass, at);
    envelope.connect(filter);
    tail = filter;
  }
  tail.connect(target);

  const oscillator = ctx.createOscillator();
  oscillator.type = note.wave;
  oscillator.frequency.setValueAtTime(note.freq, at);
  oscillator.connect(envelope);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.05);

  if (note.noise !== undefined) {
    /*
     * Eigener kurzer Rauschpuffer statt des geteilten aus dem AudioManager: Besen und
     * Uhrticks brauchen nur ein paar Millisekunden, und ein Sekundenpuffer pro Schritt
     * neu zu starten waere Verschwendung im Sechzehntel-Takt.
     */
    const frames = Math.ceil(ctx.sampleRate * Math.min(0.2, duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = note.noise * note.gain;
    source.connect(noiseGain);
    noiseGain.connect(target);
    source.start(at);
  }
}

function pump(): void {
  const nodes = musicNodes();
  if (!nodes || !current || !trackGain) {
    stopMusic();
    return;
  }
  const { ctx } = nodes;
  const voices = TRACKS[current];
  const horizon = ctx.currentTime + MUSIC.lookaheadMs / 1000;

  if (nextStepAt < ctx.currentTime) nextStepAt = ctx.currentTime + 0.05;

  while (nextStepAt < horizon) {
    const seconds = stepSeconds(current);
    for (const voice of voices) {
      const note = voice[step % voice.length];
      if (note) schedule(ctx, trackGain, note, nextStepAt, seconds);
    }
    nextStepAt += seconds;
    step += 1;
  }
}

/**
 * Startet einen Loop. Derselbe Track zweimal gestartet macht nichts — die Screens rufen
 * das beim Betreten, und ein Neustart wuerde den Takt zerreissen.
 */
export function startMusic(track: MusicTrack): void {
  if (current === track && timer !== undefined) return;
  stopMusic();

  const nodes = musicNodes();
  if (!nodes) return;

  trackGain = nodes.ctx.createGain();
  trackGain.gain.setValueAtTime(0.0001, nodes.ctx.currentTime);
  trackGain.gain.linearRampToValueAtTime(
    MUSIC[track].gain,
    nodes.ctx.currentTime + MUSIC.fadeMs / 1000
  );
  trackGain.connect(nodes.bus);

  current = track;
  intensity = 0;
  step = 0;
  nextStepAt = nodes.ctx.currentTime + 0.08;
  pump();
  timer = globalThis.setInterval(pump, MUSIC.tickMs);
}

/**
 * Wie dringend es ist, 0 bis 1. Der Verhandlungs-Loop zieht damit in den letzten zehn
 * Sekunden an (GDD §6); die anderen beiden ignorieren es, weil ihre beiden Tempi
 * gleich sind.
 */
export function setMusicIntensity(value: number): void {
  intensity = Math.min(1, Math.max(0, value));
}

export function stopMusic(): void {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  current = undefined;
  step = 0;

  const nodes = musicNodes();
  if (trackGain && nodes) {
    /*
     * Ausblenden statt abschneiden — und der Knoten wird danach getrennt, damit ein
     * langer Abend keine Kette toter Gain-Knoten am Bus hinterlaesst.
     */
    const gain = trackGain;
    const endAt = nodes.ctx.currentTime + MUSIC.fadeMs / 1000;
    gain.gain.cancelScheduledValues(nodes.ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, nodes.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0001, endAt);
    globalThis.setTimeout(() => gain.disconnect(), MUSIC.fadeMs + 200);
  }
  trackGain = undefined;
}

/** Testhilfe: welcher Loop laeuft gerade. */
export function currentMusic(): MusicTrack | undefined {
  return current;
}
