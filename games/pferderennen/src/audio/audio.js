/**
 * Web Audio foundation: context only after the first user gesture, master gain, muting with a fade.
 *
 * Every browser refuses to start an AudioContext before the user has touched something, so the
 * context is built lazily on the first call to `unlock()` — which the UI wires to the first tap.
 * Everything downstream goes through one master chain, so muting and the photo-finish lowpass
 * are single-node operations rather than something every voice has to know about.
 */

import { AUDIO } from '../config.js';

/** @type {AudioContext|null} */
let ctx = null;
/** @type {GainNode|null} */
let master = null;
/** @type {BiquadFilterNode|null} */
let lowpass = null;
/** @type {AudioBuffer|null} */
let noise = null;

let muted = false;

/**
 * Builds the context and the master chain. Safe to call as often as you like; only the first
 * call does anything. Returns false when the browser has no Web Audio at all.
 * @returns {boolean}
 */
export function unlock() {
  if (ctx) {
    // Safari suspends the context again whenever the page goes to the background, and rejects
    // the resume if the call did not come from a gesture. Neither is worth an error.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }

  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) return false;

  // Safari throws once a page has opened too many contexts. A game without sound still works;
  // a game that throws on the first tap does not (audit A6).
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
    return false;
  }

  lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = AUDIO.lowpassOpen;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : AUDIO.masterGain;
  lowpass.connect(master);
  master.connect(ctx.destination);
  return true;
}

/** @returns {boolean} whether sound can play right now */
export function ready() {
  return ctx !== null && ctx.state === 'running' && !muted;
}

/** @returns {AudioContext|null} */
export function context() {
  return ctx;
}

/**
 * Where every voice connects. Sitting behind the lowpass means the photo finish can duck the
 * whole mix with one ramp.
 * @returns {AudioNode|null}
 */
export function bus() {
  return lowpass;
}

/** @returns {number} the context clock, or 0 before the first gesture */
export function now() {
  return ctx ? ctx.currentTime : 0;
}

/**
 * Mutes or unmutes with a short fade — a hard cut on a running hoofbeat loop clicks.
 * @param {boolean} value
 */
export function setMuted(value) {
  muted = value;
  if (!master || !ctx) return;
  const target = value ? 0 : AUDIO.masterGain;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(target, ctx.currentTime + AUDIO.muteFade);
}

/** @returns {boolean} */
export function isMuted() {
  return muted;
}

/**
 * Rolls the master lowpass towards a corner frequency. Open is inaudible, closed is the muffled
 * "everything holds its breath" of the photo finish.
 * @param {number} hz
 * @param {number} [seconds]
 */
export function setLowpass(hz, seconds = AUDIO.lowpassRamp) {
  if (!lowpass || !ctx) return;
  lowpass.frequency.cancelScheduledValues(ctx.currentTime);
  lowpass.frequency.setValueAtTime(lowpass.frequency.value, ctx.currentTime);
  lowpass.frequency.exponentialRampToValueAtTime(Math.max(40, hz), ctx.currentTime + seconds);
}

/**
 * One second of white noise, built once and reused by every cue that needs a rasp: hooves,
 * crowd, camera clicks, the UI tap.
 * @returns {AudioBuffer|null}
 */
export function noiseBuffer() {
  if (!ctx) return null;
  if (noise) return noise;
  const length = ctx.sampleRate;
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return noise;
}

/**
 * Frees everything. Only used by tests and by a full teardown; the game keeps its context for
 * the lifetime of the page.
 */
export function dispose() {
  try {
    ctx?.close();
  } catch {
    // Already closed, or a browser that refuses. Either way there is nothing left to do.
  }
  ctx = null;
  master = null;
  lowpass = null;
  noise = null;
}
