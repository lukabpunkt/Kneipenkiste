/**
 * Synthesised sound cues: hoofbeats, starting bell, crowd, event sounds, fanfare, UI tap.
 *
 * Nothing here is a file. Every sound is built from oscillators and one shared noise buffer, so
 * the whole audio layer costs zero bytes of download and works offline by construction
 * (docs/04_DESIGN_SYSTEM.md §10). Each cue is a small function that schedules a few nodes and
 * lets them die on their own — there is no voice pool to leak.
 */

import { AUDIO } from '../config.js';
import { bus, context, noiseBuffer, now, ready, setLowpass } from './audio.js';
import { burst, envelope, tone } from './voices.js';

/* --- One-shot cues -------------------------------------------------------- */

/** Short click for taps on buttons and cards. */
export function uiTap() {
  if (!ready()) return;
  burst({ duration: 0.02, gain: 0.12, freq: 2600, filter: 'bandpass', q: 1.4 });
}

/** Starting bell: a sine with two overtones and a long-ish decay. */
export function bell() {
  if (!ready()) return;
  const at = now();
  tone({ freq: 880, at, attack: 0.002, decay: 1.1, gain: 0.3 });
  tone({ freq: 1320, at, attack: 0.002, decay: 0.7, gain: 0.14 });
  tone({ freq: 2640, at, attack: 0.002, decay: 0.35, gain: 0.06 });
}

/**
 * The starting pistol: a hard crack with a body underneath it and a short tail.
 *
 * Three layers, because a single burst sounds like a click rather than a shot — the broadband
 * snap is what the ear hears first, the low sweep gives it weight, and the tail is the room.
 */
export function shot() {
  if (!ready()) return;
  const at = now();
  burst({ at, duration: 0.03, gain: 0.42, freq: 2600, filter: 'lowpass', q: 0.7 });
  tone({ type: 'square', freq: 190, toFreq: 42, at, attack: 0.001, decay: 0.18, gain: 0.26 });
  burst({ at: at + 0.02, duration: 0.34, gain: 0.1, freq: 900, filter: 'lowpass', q: 0.5 });
}

/** Slide whistle downwards — someone just met a banana skin. */
export function slip() {
  if (!ready()) return;
  tone({ type: 'triangle', freq: 1400, toFreq: 220, attack: 0.01, decay: 0.55, gain: 0.22 });
}

/** Bubbling: a low sawtooth whose lowpass is wobbled by an LFO. */
export function vomit() {
  const ctx = context();
  if (!ready() || !ctx) return;
  const at = ctx.currentTime;
  const env = envelope(at, 0.22, 0.02, 0.9);
  if (!env) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 320;
  filter.Q.value = 6;
  filter.connect(env);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 190;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 68;
  osc.connect(filter);

  for (const node of [osc, lfo]) {
    node.start(at);
    node.stop(at + 1.0);
  }
}

/** The classic: a short low sawtooth with vibrato. */
export function fart() {
  const ctx = context();
  if (!ready() || !ctx) return;
  const at = ctx.currentTime;
  const env = envelope(at, 0.2, 0.01, 0.42);
  if (!env) return;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(70, at + 0.4);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 22;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 28;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.connect(env);
  for (const node of [osc, lfo]) {
    node.start(at);
    node.stop(at + 0.45);
  }
}

/** Two short chirps. */
export function pigeon() {
  if (!ready()) return;
  const at = now();
  tone({ type: 'sine', freq: 1900, toFreq: 2600, at, attack: 0.004, decay: 0.07, gain: 0.14 });
  tone({
    type: 'sine',
    freq: 2100,
    toFreq: 2900,
    at: at + 0.13,
    attack: 0.004,
    decay: 0.07,
    gain: 0.12,
  });
}

/** Camera shutters, and the whole mix ducks behind a lowpass. */
export function photoFinish() {
  if (!ready()) return;
  const at = now();
  setLowpass(AUDIO.lowpassPhotoFinish);
  for (let i = 0; i < 7; i += 1) {
    burst({
      at: at + i * 0.09 + Math.random() * 0.04,
      duration: 0.018,
      gain: 0.16,
      freq: 3400,
      filter: 'bandpass',
      q: 2,
    });
  }
}

/** Lets the mix breathe again after the photo finish. */
export function photoFinishOver() {
  setLowpass(AUDIO.lowpassOpen);
}

/** Three-note major arpeggio. */
export function fanfare() {
  if (!ready()) return;
  const at = now();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    tone({
      type: 'triangle',
      freq,
      at: at + i * 0.13,
      attack: 0.01,
      decay: i === notes.length - 1 ? 0.9 : 0.3,
      gain: 0.22,
    });
  });
}

/** The finish tape giving way: a very short, bright rip. */
export function tapeRip() {
  if (!ready()) return;
  const at = now();
  burst({ at, duration: 0.05, gain: 0.14, freq: 5200, filter: 'highpass', q: 0.8 });
  burst({ at: at + 0.03, duration: 0.09, gain: 0.08, freq: 3200, filter: 'highpass', q: 0.8 });
}

/** Rising zip — anything that suddenly speeds up. */
export function zip() {
  if (!ready()) return;
  tone({ type: 'square', freq: 220, toFreq: 1500, attack: 0.01, decay: 0.3, gain: 0.12 });
}

/** A slow low wobble: someone is asleep on the track. */
export function snore() {
  if (!ready()) return;
  const at = now();
  tone({ type: 'sawtooth', freq: 90, toFreq: 55, at, attack: 0.18, decay: 0.5, gain: 0.14 });
  tone({
    type: 'sawtooth',
    freq: 70,
    toFreq: 110,
    at: at + 0.7,
    attack: 0.2,
    decay: 0.4,
    gain: 0.1,
  });
}

/** A single camera shutter, for the events that are about being photographed. */
export function shutter() {
  if (!ready()) return;
  burst({ duration: 0.018, gain: 0.16, freq: 3400, filter: 'bandpass', q: 2 });
}

/** A filtered sawtooth sweep: the crowd going "oooh". */
export function crowdGasp() {
  const ctx = context();
  if (!ready() || !ctx) return;
  const at = ctx.currentTime;
  const env = envelope(at, 0.12, 0.12, 0.7);
  if (!env) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(420, at);
  filter.frequency.linearRampToValueAtTime(900, at + 0.5);
  filter.Q.value = 3.5;
  filter.connect(env);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.linearRampToValueAtTime(210, at + 0.5);
  osc.connect(filter);
  osc.start(at);
  osc.stop(at + 0.85);
}

/* --- Continuous beds ------------------------------------------------------ */

/**
 * The hoofbeat loop. It is not a loop in the buffer sense: every step is scheduled individually
 * a little ahead of time, which is what lets the tempo follow the field without a pitch artefact.
 * @returns {{setSpeed: (speed: number) => void, setPan: (pan: number) => void, stop: () => void}}
 */
export function hoofbeats() {
  const ctx = context();
  let rate = AUDIO.hoofBaseRate;
  let nextStep = ctx ? ctx.currentTime + 0.05 : 0;
  let timer = null;
  let running = true;

  /** Schedules every step that falls inside the next lookahead window. */
  function pump() {
    if (!running || !ctx) return;
    const horizon = ctx.currentTime + 0.25;
    while (nextStep < horizon) {
      // Two hits per step, the second quieter: a gallop is not a metronome.
      burst({ at: nextStep, duration: 0.05, gain: AUDIO.hoofGain, freq: 260, q: 1.2 });
      burst({
        at: nextStep + 0.5 / rate,
        duration: 0.04,
        gain: AUDIO.hoofGain * 0.6,
        freq: 200,
        q: 1.2,
      });
      nextStep += 1 / rate;
    }
    timer = setTimeout(pump, 100);
  }

  if (ctx && ready()) pump();

  return {
    /**
     * @param {number} speed mean field speed, 1 is the base pace
     */
    setSpeed(speed) {
      const clamped = Math.max(0.2, Math.min(2, speed));
      rate = AUDIO.hoofBaseRate + (clamped - 1) * AUDIO.hoofRateRange;
    },
    /** Reserved for the stereo image; a mono bus ignores it. */
    setPan() {},
    stop() {
      running = false;
      if (timer !== null) clearTimeout(timer);
    },
  };
}

/**
 * The crowd bed: brown noise that swells towards the line.
 * @returns {{setIntensity: (value: number) => void, stop: () => void}}
 */
export function crowd() {
  const ctx = context();
  const buffer = noiseBuffer();
  if (!ctx || !buffer || !ready()) {
    return { setIntensity() {}, stop() {} };
  }

  const at = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.value = AUDIO.crowdGainStart;
  gain.connect(bus());

  // Two stacked lowpasses turn white noise into something close to brown: a soft, distant hiss.
  const first = ctx.createBiquadFilter();
  first.type = 'lowpass';
  first.frequency.value = 700;
  const second = ctx.createBiquadFilter();
  second.type = 'lowpass';
  second.frequency.value = 400;
  first.connect(second);
  second.connect(gain);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(first);
  source.start(at);

  return {
    /**
     * @param {number} value 0 at the start, 1 at the line
     */
    setIntensity(value) {
      const t = Math.max(0, Math.min(1, value));
      const target = AUDIO.crowdGainStart + (AUDIO.crowdGainFinish - AUDIO.crowdGainStart) * t * t;
      gain.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
    },
    stop() {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      source.stop(ctx.currentTime + 0.6);
    },
  };
}

/**
 * Maps an event id to its cue. Events without a sound of their own get the crowd's reaction,
 * which is what carries "something just happened" to the room.
 * @param {string} id
 */
export function playEvent(id) {
  if (!ready()) return;
  switch (id) {
    case 'banana':
    case 'mud':
    case 'stumble':
      slip();
      break;
    case 'vomit':
    case 'pee':
      vomit();
      break;
    case 'rainbow_fart':
    case 'hiccup':
      fart();
      break;
    case 'pigeon':
    case 'ufo':
      pigeon();
      break;
    case 'selfie':
    case 'camera_flash':
      shutter();
      break;
    case 'espresso':
    case 'rocket_boots':
    case 'tailwind':
    case 'slipstream':
      zip();
      break;
    case 'nap':
      snore();
      break;
    default:
      crowdGasp();
  }
}
