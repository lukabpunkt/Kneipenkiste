/**
 * Tests for the race camera (src/render/camera.js).
 * The camera must keep the whole field in view — losing sight of your own horse would be the
 * worst possible failure in a game whose entire point is watching it (audit A3).
 */
import { describe, it, expect } from 'vitest';
import { createCamera } from '../../src/render/camera.js';
import { TRACK_LENGTH } from '../../src/config.js';

const STEP = 1 / 60;

/** Runs the camera for a while against a fixed field. */
function settle(camera, positions, seconds = 3) {
  for (let t = 0; t < seconds; t += STEP) camera.update(positions, positions.length, STEP);
  return camera;
}

describe('createCamera', () => {
  it('starts far enough back to show the starting gates', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    expect(camera.zoom).toBe(1);
    // The start line has to sit comfortably inside the view, not on the edge.
    const start = camera.toAlong(0);
    expect(start).toBeGreaterThan(120);
    expect(start).toBeLessThan(400);
  });

  it('follows the field', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    settle(camera, [400, 410, 420, 430, 440, 450]);
    expect(camera.centre).toBeGreaterThan(400);
    expect(camera.centre).toBeLessThan(480);
  });

  it('keeps every runner on screen when the field spreads out', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    const spread = [300, 360, 420, 480, 540, 600];
    settle(camera, spread, 6);

    for (const position of spread) {
      const x = camera.toAlong(position);
      expect(x, `${position} liegt ausserhalb`).toBeGreaterThan(-20);
      expect(x).toBeLessThan(1220);
    }
    // It had to pull back to manage that.
    expect(camera.zoom).toBeLessThan(1);
  });

  it('never zooms out past its limit', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    settle(camera, [0, 200, 400, 600, 800, 1000], 8);
    expect(camera.zoom).toBeGreaterThanOrEqual(0.55);
  });

  it('keeps the gates in view while the horses are still in them', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    settle(camera, [0, 0, 0, 0, 0, 0], 4);
    const gates = camera.toAlong(0);
    expect(gates).toBeGreaterThan(120);
    expect(gates).toBeLessThan(600);
  });

  it('stops just past the finish rather than running off the end', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    settle(camera, new Array(6).fill(TRACK_LENGTH), 8);
    expect(camera.centre).toBeLessThanOrEqual(TRACK_LENGTH);
    // The finish line stays inside the view.
    const finish = camera.toAlong(TRACK_LENGTH);
    expect(finish).toBeGreaterThan(0);
    expect(finish).toBeLessThan(1200);
  });

  it('moves the same distance regardless of the frame rate', () => {
    const field = [500, 500, 500, 500, 500, 500];
    const slow = createCamera({ viewUnits: 340 });
    slow.setViewport(1200);
    const fast = createCamera({ viewUnits: 340 });
    fast.setViewport(1200);

    for (let t = 0; t < 1; t += 1 / 30) slow.update(field, 6, 1 / 30);
    for (let t = 0; t < 1; t += 1 / 144) fast.update(field, 6, 1 / 144);
    expect(slow.centre).toBeCloseTo(fast.centre, 0);
  });

  it('shakes and then settles back', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    camera.shake(1);
    camera.update([500], 1, STEP);
    expect(Math.abs(camera.shakeCross)).toBeGreaterThan(0);
    settle(camera, [500], 2);
    expect(camera.shakeCross).toBe(0);
  });

  it('resets to the start line', () => {
    const camera = createCamera({ viewUnits: 340 });
    camera.setViewport(1200);
    settle(camera, [800, 800, 800, 800, 800, 800]);
    camera.reset();
    expect(camera.zoom).toBe(1);
    expect(camera.toAlong(0)).toBeGreaterThan(120);
  });
});
