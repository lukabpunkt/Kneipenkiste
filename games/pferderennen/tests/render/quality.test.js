/**
 * Tests for the automatic quality control (src/render/quality.js).
 *
 * The rule that matters: it only ever steps down. Stepping back up would make the picture
 * flicker between two looks every time the frame rate wobbles around the threshold.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createQualityMonitor, quality, resetQuality } from '../../src/render/quality.js';
import { RENDER } from '../../src/config.js';

/** Feeds the monitor a stretch of frames at a given rate. */
function feed(monitor, fps, seconds) {
  const dt = 1 / fps;
  for (let t = 0; t < seconds; t += dt) monitor.sample(dt);
}

beforeEach(() => {
  resetQuality();
});

describe('createQualityMonitor', () => {
  it('starts at full quality', () => {
    createQualityMonitor();
    expect(quality.level).toBe('high');
  });

  it('measures the frame rate', () => {
    const monitor = createQualityMonitor();
    feed(monitor, 60, 1);
    expect(monitor.fps()).toBeGreaterThan(55);
    expect(monitor.fps()).toBeLessThan(65);
  });

  it('leaves the quality alone while the frame rate holds up', () => {
    const monitor = createQualityMonitor();
    feed(monitor, 60, 10);
    expect(quality.level).toBe('high');
  });

  it('steps down after the frame rate has been low for the whole window', () => {
    const monitor = createQualityMonitor();
    feed(monitor, 30, RENDER.quality.windowSeconds + 1);
    expect(quality.level).toBe('low');
  });

  it('tolerates a brief dip without changing anything', () => {
    const monitor = createQualityMonitor();
    feed(monitor, 30, 0.6);
    feed(monitor, 60, 3);
    expect(quality.level).toBe('high');
  });

  it('reports the change exactly once', () => {
    const onChange = vi.fn();
    const monitor = createQualityMonitor(onChange);
    feed(monitor, 20, 10);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('low');
  });

  it('never steps back up, even when the frame rate recovers', () => {
    const monitor = createQualityMonitor();
    feed(monitor, 20, 5);
    expect(quality.level).toBe('low');
    feed(monitor, 120, 10);
    expect(quality.level).toBe('low');
  });

  it('is reset for a fresh race', () => {
    const monitor = createQualityMonitor();
    feed(monitor, 20, 5);
    resetQuality();
    expect(quality.level).toBe('high');
  });
});
