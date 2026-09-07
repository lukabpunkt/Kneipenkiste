/**
 * Tests for the track geometry (src/render/track*.js).
 *
 * These check the layout arithmetic rather than the pixels: that every horse lands inside its
 * own lane, that the race runs the right way in each orientation, and that switching between
 * them is a pure function of the viewport.
 */
import { describe, it, expect } from 'vitest';
import { orientationFor } from '../../src/render/track.js';
import { createLandscapeTrack } from '../../src/render/trackLandscape.js';
import { createPortraitTrack } from '../../src/render/trackPortrait.js';
import { createCamera } from '../../src/render/camera.js';
import { HORSES } from '../../src/data/horses.js';
import { TRACK_LENGTH, RUNNER_COUNT, RENDER } from '../../src/config.js';

/** A track of the requested kind, sized and ready. Offscreen caches are skipped in Node. */
function build(kind, width, height) {
  const camera = createCamera({});
  const make = kind === 'portrait' ? createPortraitTrack : createLandscapeTrack;
  const track = make({ camera, horses: HORSES });
  // resize() builds the OffscreenCanvas caches, which Node does not have; set the viewport by
  // hand instead, since only the geometry is under test here.
  camera.setViewport(kind === 'portrait' ? height : width);
  try {
    track.resize(width, height);
  } catch {
    // No OffscreenCanvas in Node — the layout maths below does not need it.
  }
  return { track, camera };
}

describe('orientationFor', () => {
  it('calls a wide viewport landscape and a tall one portrait', () => {
    expect(orientationFor(1440, 900)).toBe('landscape');
    expect(orientationFor(390, 844)).toBe('portrait');
  });

  it('switches exactly at the configured aspect ratio', () => {
    const ratio = RENDER.landscapeAspect;
    expect(orientationFor(ratio * 1000, 1000)).toBe('landscape');
    expect(orientationFor(ratio * 1000 - 1, 1000)).toBe('portrait');
  });

  it('never divides by zero on a viewport with no height', () => {
    expect(() => orientationFor(800, 0)).not.toThrow();
  });
});

describe('the landscape track', () => {
  it('runs left to right', () => {
    const { track } = build('landscape', 1200, 700);
    expect(track.positionOf(800, 0).x).toBeGreaterThan(track.positionOf(200, 0).x);
  });

  it('gives every lane its own band, back to front', () => {
    const { track } = build('landscape', 1200, 700);
    let previous = -Infinity;
    for (let lane = 0; lane < RUNNER_COUNT; lane += 1) {
      const y = track.positionOf(500, lane).y;
      expect(y).toBeGreaterThan(previous);
      previous = y;
    }
  });

  it('draws the front lanes larger, which is what gives the depth', () => {
    const { track } = build('landscape', 1200, 700);
    expect(track.horseSize(5)).toBeGreaterThan(track.horseSize(0));
  });

  it('sorts the back lane first so the front one overlaps it', () => {
    const { track } = build('landscape', 1200, 700);
    expect(track.depthKey(500, 0)).toBeLessThan(track.depthKey(500, 5));
  });

  it('asks for the side view of the horse', () => {
    expect(build('landscape', 1200, 700).track.view).toBe('side');
  });
});

describe('the portrait track', () => {
  it('runs bottom to top', () => {
    const { track } = build('portrait', 400, 900);
    expect(track.positionOf(800, 0).y).toBeLessThan(track.positionOf(200, 0).y);
  });

  it('puts the finish above the start', () => {
    const { track } = build('portrait', 400, 900);
    expect(track.positionOf(TRACK_LENGTH, 0).y).toBeLessThan(track.positionOf(0, 0).y);
  });

  it('gives every lane its own column, left to right', () => {
    const { track } = build('portrait', 400, 900);
    let previous = -Infinity;
    for (let lane = 0; lane < RUNNER_COUNT; lane += 1) {
      const x = track.positionOf(500, lane).x;
      expect(x).toBeGreaterThan(previous);
      previous = x;
    }
  });

  it('keeps every lane inside the racing surface', () => {
    const width = 400;
    const { track } = build('portrait', width, 900);
    for (let lane = 0; lane < RUNNER_COUNT; lane += 1) {
      const x = track.positionOf(500, lane).x;
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(width);
    }
  });

  it('draws every horse the same size, because every lane is the same width', () => {
    const { track } = build('portrait', 400, 900);
    expect(track.horseSize(0)).toBeCloseTo(track.horseSize(5), 9);
  });

  it('sorts the leader first, so a trailing horse overlaps the one ahead', () => {
    const { track } = build('portrait', 400, 900);
    expect(track.depthKey(900, 0)).toBeLessThan(track.depthKey(100, 0));
  });

  it('asks for the rear view of the horse', () => {
    expect(build('portrait', 400, 900).track.view).toBe('rear');
  });

  it('fits a horse comfortably inside its lane', () => {
    const { track } = build('portrait', 400, 900);
    expect(track.horseSize(0)).toBeLessThan(track.laneHeight(0));
  });
});

describe('the crowd', () => {
  it('settles back down after cheering', () => {
    for (const kind of ['landscape', 'portrait']) {
      const { track } = build(kind, 1000, 800);
      expect(() => {
        track.cheer();
        for (let i = 0; i < 200; i += 1) track.tick(1 / 60);
      }, kind).not.toThrow();
    }
  });
});

describe('both orientations', () => {
  it('expose the same interface, so the race screen never has to branch', () => {
    const landscape = build('landscape', 1200, 700).track;
    const portrait = build('portrait', 400, 900).track;
    const required = [
      'view',
      'resize',
      'positionOf',
      'horseSize',
      'depthKey',
      'drawBackdrop',
      'drawTrack',
      'drawGates',
      'starterAnchor',
      'setCrowdEnergy',
      'drawFinish',
      'drawOverhead',
      'drawForeground',
      'cheer',
      'tick',
    ];
    for (const key of required) {
      expect(landscape[key], `landscape.${key}`).toBeDefined();
      expect(portrait[key], `portrait.${key}`).toBeDefined();
    }
  });
});
