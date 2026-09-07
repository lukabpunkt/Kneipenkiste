/**
 * Tests for the Web Audio foundation (src/audio/audio.js).
 *
 * The two promises worth pinning down are the ones a browser will punish silently if broken: no
 * AudioContext before a user gesture (autoplay policy — Safari and Chrome both refuse), and mute
 * as a ramp rather than a cut, because a hard cut on a running hoofbeat loop clicks.
 *
 * The real AudioContext does not exist in Node, so this stubs the shape the module actually
 * touches. That is honest here: the module's job is to make exactly these calls in this order.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AUDIO } from '../../src/config.js';

/** Records every scheduling call so the test can assert on the ramp. */
function fakeParam(value) {
  const calls = [];
  return {
    value,
    calls,
    cancelScheduledValues: (t) => calls.push(['cancel', t]),
    setValueAtTime: (v, t) => calls.push(['set', v, t]),
    linearRampToValueAtTime: (v, t) => calls.push(['linear', v, t]),
    exponentialRampToValueAtTime: (v, t) => calls.push(['exp', v, t]),
    setTargetAtTime: (v, t, c) => calls.push(['target', v, t, c]),
  };
}

/** The smallest AudioContext that src/audio/audio.js can work with. */
class FakeContext {
  constructor() {
    FakeContext.instances.push(this);
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.destination = { id: 'destination' };
    this.closed = false;
    this.gains = [];
    this.filters = [];
  }

  createGain() {
    const node = { gain: fakeParam(1), connect: () => {} };
    this.gains.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = { type: '', frequency: fakeParam(0), Q: fakeParam(1), connect: () => {} };
    this.filters.push(node);
    return node;
  }

  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length);
    return { length, sampleRate, duration: length / sampleRate, getChannelData: () => data };
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  close() {
    this.closed = true;
  }
}
FakeContext.instances = [];

/** A fresh module instance per test, since the module holds the context in a closure. */
async function loadAudio() {
  return import('../../src/audio/audio.js');
}

beforeEach(() => {
  vi.resetModules();
  FakeContext.instances = [];
  globalThis.window = { AudioContext: FakeContext };
});

afterEach(() => {
  delete globalThis.window;
});

describe('the autoplay policy', () => {
  it('creates no AudioContext before the first gesture', async () => {
    const audio = await loadAudio();
    expect(audio.context()).toBeNull();
    expect(audio.ready()).toBe(false);
    expect(FakeContext.instances).toHaveLength(0);
  });

  it('creates exactly one context, however often unlock is called', async () => {
    const audio = await loadAudio();
    audio.unlock();
    audio.unlock();
    audio.unlock();
    expect(FakeContext.instances).toHaveLength(1);
    expect(audio.ready()).toBe(true);
  });

  it('resumes a context the browser suspended in the background', async () => {
    const audio = await loadAudio();
    audio.unlock();
    const ctx = FakeContext.instances[0];
    ctx.state = 'suspended';
    expect(audio.ready()).toBe(false);
    audio.unlock();
    expect(ctx.state).toBe('running');
    expect(audio.ready()).toBe(true);
  });

  it('reports failure instead of throwing when the browser refuses another context', async () => {
    globalThis.window = {
      AudioContext: class {
        constructor() {
          throw new Error('too many contexts');
        }
      },
    };
    const audio = await loadAudio();
    expect(audio.unlock()).toBe(false);
    expect(audio.context()).toBeNull();
  });

  it('reports failure instead of throwing when the browser has no Web Audio', async () => {
    globalThis.window = {};
    const audio = await loadAudio();
    expect(audio.unlock()).toBe(false);
    expect(audio.context()).toBeNull();
    // Every cue must survive being called anyway.
    expect(() => audio.setMuted(true)).not.toThrow();
    expect(() => audio.setLowpass(500)).not.toThrow();
    expect(audio.noiseBuffer()).toBeNull();
  });
});

describe('muting', () => {
  it('ramps the master gain to zero rather than cutting it', async () => {
    const audio = await loadAudio();
    audio.unlock();
    const master = FakeContext.instances[0].gains[0];
    master.gain.calls.length = 0;

    audio.setMuted(true);

    expect(master.gain.calls.map((call) => call[0])).toEqual(['cancel', 'set', 'linear']);
    const [, target, at] = master.gain.calls.at(-1);
    expect(target).toBe(0);
    expect(at).toBeCloseTo(AUDIO.muteFade, 5);
  });

  it('ramps back to the master gain on unmute', async () => {
    const audio = await loadAudio();
    audio.unlock();
    const master = FakeContext.instances[0].gains[0];
    audio.setMuted(true);
    master.gain.calls.length = 0;

    audio.setMuted(false);

    expect(master.gain.calls.at(-1)[1]).toBe(AUDIO.masterGain);
    expect(audio.isMuted()).toBe(false);
  });

  it('starts silent when it was muted before the first gesture', async () => {
    const audio = await loadAudio();
    audio.setMuted(true);
    audio.unlock();
    expect(FakeContext.instances[0].gains[0].gain.value).toBe(0);
  });

  it('is never ready while muted, even with a running context', async () => {
    const audio = await loadAudio();
    audio.unlock();
    audio.setMuted(true);
    expect(audio.ready()).toBe(false);
  });
});

describe('the master lowpass', () => {
  it('opens at a frequency nobody can hear being filtered', async () => {
    const audio = await loadAudio();
    audio.unlock();
    expect(FakeContext.instances[0].filters[0].frequency.value).toBe(AUDIO.lowpassOpen);
  });

  it('ramps towards the photo-finish corner instead of jumping', async () => {
    const audio = await loadAudio();
    audio.unlock();
    const filter = FakeContext.instances[0].filters[0];
    filter.frequency.calls.length = 0;

    audio.setLowpass(AUDIO.lowpassPhotoFinish);

    expect(filter.frequency.calls.map((call) => call[0])).toEqual(['cancel', 'set', 'exp']);
    expect(filter.frequency.calls.at(-1)[1]).toBe(AUDIO.lowpassPhotoFinish);
  });

  it('never ramps to zero, which an exponential ramp cannot reach', async () => {
    const audio = await loadAudio();
    audio.unlock();
    audio.setLowpass(0);
    expect(FakeContext.instances[0].filters[0].frequency.calls.at(-1)[1]).toBeGreaterThan(0);
  });
});

describe('the shared noise buffer', () => {
  it('is built once and handed out again', async () => {
    const audio = await loadAudio();
    audio.unlock();
    const first = audio.noiseBuffer();
    expect(first).not.toBeNull();
    expect(audio.noiseBuffer()).toBe(first);
  });

  it('holds one second of audio', async () => {
    const audio = await loadAudio();
    audio.unlock();
    expect(audio.noiseBuffer().duration).toBe(1);
  });
});
