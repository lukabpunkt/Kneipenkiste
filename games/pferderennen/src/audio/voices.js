/**
 * The three building blocks every cue is made of: an envelope, an oscillator voice, and a burst
 * of filtered noise.
 *
 * They live apart from the cues themselves because they are the vocabulary, not the words. Each
 * one schedules its nodes and lets them die on their own — there is no voice pool to leak.
 */

import { bus, context, noiseBuffer } from './audio.js';

/**
 * Builds a gain node with an attack-decay envelope and connects it to the bus.
 * @param {number} at when the sound starts, on the context clock
 * @param {number} peak
 * @param {number} attack seconds
 * @param {number} decay seconds
 * @returns {GainNode|null}
 */
export function envelope(at, peak, attack, decay) {
  const ctx = context();
  if (!ctx) return null;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  // Exponential towards silence sounds natural, but may never reach zero, hence the tiny floor.
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  gain.connect(bus());
  return gain;
}

/**
 * A single oscillator voice with an envelope.
 * @param {object} options
 * @param {OscillatorType} [options.type]
 * @param {number} options.freq
 * @param {number} [options.toFreq] glides there if given
 * @param {number} [options.at] defaults to now
 * @param {number} [options.attack]
 * @param {number} [options.decay]
 * @param {number} [options.gain]
 */
export function tone({
  type = 'sine',
  freq,
  toFreq,
  at,
  attack = 0.005,
  decay = 0.25,
  gain = 0.3,
}) {
  const ctx = context();
  if (!ctx) return;
  const start = at ?? ctx.currentTime;
  const env = envelope(start, gain, attack, decay);
  if (!env) return;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (toFreq !== undefined)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), start + attack + decay);
  osc.connect(env);
  osc.start(start);
  osc.stop(start + attack + decay + 0.05);
}

/**
 * A burst of filtered noise — the raw material for hooves, clicks and the crowd's rasp.
 * @param {object} options
 * @param {number} [options.at]
 * @param {number} [options.duration]
 * @param {number} [options.gain]
 * @param {number} [options.freq] lowpass corner
 * @param {BiquadFilterType} [options.filter]
 * @param {number} [options.q]
 */
export function burst({ at, duration = 0.06, gain = 0.3, freq = 1200, filter = 'lowpass', q = 1 }) {
  const ctx = context();
  const buffer = noiseBuffer();
  if (!ctx || !buffer) return;
  const start = at ?? ctx.currentTime;

  const env = envelope(start, gain, 0.004, duration);
  if (!env) return;

  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.frequency.value = freq;
  band.Q.value = q;
  band.connect(env);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // A random offset into the shared buffer, so repeated hoofbeats are not literally identical.
  source.loop = true;
  source.connect(band);
  source.start(start, Math.random() * (buffer.duration - duration - 0.01));
  source.stop(start + duration + 0.05);
}
