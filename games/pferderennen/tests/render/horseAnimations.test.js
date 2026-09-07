/**
 * Tests for the horse animation state (src/render/horseAnimations.js).
 *
 * The one that matters most is the continuity of the gallop phase. Audit A3 asks that the leg
 * angles never jump when the speed changes, which only holds if the phase is integrated rather
 * than recomputed from the clock — so that is checked directly here.
 */
import { describe, it, expect } from 'vitest';
import {
  createPose,
  updatePose,
  legAngles,
  bodyLift,
  ANIMATION_STATES,
} from '../../src/render/horseAnimations.js';

const STEP = 1 / 60;

/** Runs the pose forward for a while at a given speed. */
function run(pose, seconds, options) {
  for (let t = 0; t < seconds; t += STEP) updatePose(pose, STEP, options);
  return pose;
}

describe('createPose', () => {
  it('gives each horse a different point in the stride', () => {
    const phases = [0, 1, 2, 3, 4, 5].map((i) => createPose(i / 6).phase);
    expect(new Set(phases).size).toBe(6);
  });

  it('starts with the hair at rest', () => {
    const pose = createPose(0);
    expect([...pose.mane]).toEqual([0, 0, 0, 0]);
    expect([...pose.tail]).toEqual([0, 0, 0, 0]);
  });
});

describe('the gallop phase', () => {
  it('advances continuously and wraps inside [0, 1)', () => {
    const pose = createPose(0);
    for (let i = 0; i < 600; i += 1) {
      updatePose(pose, STEP, { anim: 'gallop', speed: 1 });
      expect(pose.phase).toBeGreaterThanOrEqual(0);
      expect(pose.phase).toBeLessThan(1);
    }
  });

  it('never jumps when the speed changes — the legs must not snap', () => {
    const pose = run(createPose(0), 2, { anim: 'gallop', speed: 1 });

    let previous = legAngles(pose.phase, 0, pose.swing, false).thigh;
    let worst = 0;
    // Sweep the speed hard, the way an espresso or a vomit does mid-race.
    for (let i = 0; i < 600; i += 1) {
      const speed = 0.3 + 1.6 * Math.abs(Math.sin(i / 40));
      updatePose(pose, STEP, { anim: 'gallop', speed });
      const angle = legAngles(pose.phase, 0, pose.swing, false).thigh;
      worst = Math.max(worst, Math.abs(angle - previous));
      previous = angle;
    }
    // The smooth maximum is known exactly: at speed 1.9 a stride lasts 0.55/1.9 s, so one frame
    // advances the phase by 0.058, and the thigh angle has slope 2*pi*0.7 — about 0.25 rad per
    // frame. A phase recomputed from the clock instead of integrated would jump by more than a
    // radian here, so the bound is set to catch that, not to police the legitimate motion.
    expect(worst).toBeLessThan(0.35);
  });

  it('takes shorter strides the faster the horse runs', () => {
    const slow = run(createPose(0), 1, { anim: 'gallop', speed: 0.5 });
    const fast = run(createPose(0), 1, { anim: 'gallop', speed: 2 });
    // Both started at phase 0; after the same time the fast one has covered more strides.
    const strides = (pose, speed) => {
      let count = 0;
      let last = pose.phase;
      for (let i = 0; i < 300; i += 1) {
        updatePose(pose, STEP, { anim: 'gallop', speed });
        if (pose.phase < last) count += 1;
        last = pose.phase;
      }
      return count;
    };
    expect(strides(fast, 2)).toBeGreaterThan(strides(slow, 0.5));
  });

  it('stands still in the idle state', () => {
    const pose = run(createPose(0.3), 2, { anim: 'idle', speed: 0 });
    const before = pose.phase;
    run(pose, 1, { anim: 'idle', speed: 0 });
    expect(pose.phase).toBeCloseTo(before, 6);
  });
});

describe('state blending', () => {
  it('eases into a new state instead of snapping', () => {
    const pose = run(createPose(0), 1, { anim: 'gallop', speed: 1 });
    const before = pose.lean;
    updatePose(pose, STEP, { anim: 'celebrate', speed: 1 });
    // One frame moves it a little, not all the way.
    expect(Math.abs(pose.lean - before)).toBeLessThan(0.1);
    run(pose, 1.5, { anim: 'celebrate', speed: 1 });
    expect(pose.rear).toBeGreaterThan(0.9);
  });

  it('reaches every state it knows', () => {
    for (const anim of ANIMATION_STATES) {
      const pose = run(createPose(0), 2, { anim, speed: 1 });
      expect(Number.isFinite(pose.lean), anim).toBe(true);
      expect(Number.isFinite(pose.bounce), anim).toBe(true);
    }
  });

  it('falls back to the gallop for a state it does not know', () => {
    const known = run(createPose(0), 1, { anim: 'gallop', speed: 1 });
    const unknown = run(createPose(0), 1, { anim: 'nonsense', speed: 1 });
    expect(unknown.bounce).toBeCloseTo(known.bounce, 6);
  });
});

describe('mane and tail', () => {
  it('stay stable rather than blowing up', () => {
    const pose = createPose(0);
    for (let i = 0; i < 3000; i += 1) {
      updatePose(pose, STEP, { anim: 'gallop_fast', speed: 1.8 });
    }
    for (const angle of [...pose.mane, ...pose.tail]) {
      expect(Number.isFinite(angle)).toBe(true);
      expect(Math.abs(angle)).toBeLessThan(1);
    }
  });

  it('stream further back the faster the horse runs', () => {
    const slow = run(createPose(0), 2, { anim: 'gallop', speed: 0.4 });
    const fast = run(createPose(0), 2, { anim: 'gallop_fast', speed: 2 });
    expect(fast.stream).toBeGreaterThan(slow.stream);
  });

  it('lags behind: the last segment trails the first', () => {
    const pose = run(createPose(0), 0.2, { anim: 'gallop_fast', speed: 2 });
    expect(Math.abs(pose.mane[0])).toBeGreaterThan(Math.abs(pose.mane[3]));
  });
});

describe('legAngles', () => {
  it('is periodic over one stride', () => {
    const a = legAngles(0.25, 0, 1, false);
    const b = legAngles(1.25, 0, 1, false);
    expect(a.thigh).toBeCloseTo(b.thigh, 9);
    expect(a.shank).toBeCloseTo(b.shank, 9);
  });

  it('keeps the joint folded, never bent the wrong way', () => {
    for (let phase = 0; phase < 1; phase += 0.01) {
      for (const front of [true, false]) {
        const { thigh, shank } = legAngles(phase, 0, 1, front);
        // The lower leg always trails the upper one, which is how a horse folds.
        expect(shank).toBeLessThanOrEqual(thigh + 1e-9);
      }
    }
  });

  it('barely moves the legs when the swing is scaled down', () => {
    let range = 0;
    for (let phase = 0; phase < 1; phase += 0.02) {
      range = Math.max(range, Math.abs(legAngles(phase, 0, 0.1, false).thigh));
    }
    expect(range).toBeLessThan(0.1);
  });
});

describe('bodyLift', () => {
  it('never pushes the horse below the ground', () => {
    const pose = createPose(0);
    for (let i = 0; i < 400; i += 1) {
      updatePose(pose, STEP, { anim: 'gallop_fast', speed: 1.5 });
      expect(bodyLift(pose)).toBeGreaterThanOrEqual(0);
      expect(bodyLift(pose)).toBeLessThan(0.3);
    }
  });
});
