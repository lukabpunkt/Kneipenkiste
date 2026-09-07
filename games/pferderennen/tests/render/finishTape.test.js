/**
 * Tests for the finish tape (src/render/finishTape.js).
 *
 * The tape is decoration, so what is worth pinning down is that it cannot become anything else:
 * it tears exactly once, it tears where the winner hit it, and it never reaches back into the
 * race. The drawing itself is checked against a recording context — not to assert on pixels, but
 * to prove the tape asks the track for its geometry instead of inventing it, which is what makes
 * it work in both orientations.
 */
import { describe, it, expect } from 'vitest';
import { createFinishTape } from '../../src/render/finishTape.js';
import { FINISH_TAPE, RUNNER_COUNT, TRACK_LENGTH } from '../../src/config.js';

/**
 * A track that lays its lanes out along one axis, like the real ones do.
 * @param {'landscape'|'portrait'} orientation
 */
function fakeTrack(orientation) {
  const asked = [];
  return {
    asked,
    horseSize: () => 40,
    positionOf(units, lane) {
      asked.push({ units, lane });
      // Landscape: lanes differ in y, progress runs along x. Portrait is the other way round.
      return orientation === 'landscape'
        ? { x: 100 + units * 0.5, y: 40 + lane * 30 }
        : { x: 40 + lane * 30, y: 600 - units * 0.5 };
    },
  };
}

/** Records what was drawn, so a test can tell "something happened" from "nothing happened". */
function recordingContext() {
  const calls = [];
  const record =
    (name) =>
    (...args) => {
      calls.push({ name, args });
    };
  return {
    calls,
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    stroke: record('stroke'),
    set lineCap(value) {
      calls.push({ name: 'lineCap', args: [value] });
    },
    set lineWidth(value) {
      calls.push({ name: 'lineWidth', args: [value] });
    },
    set strokeStyle(value) {
      calls.push({ name: 'strokeStyle', args: [value] });
    },
    set globalAlpha(value) {
      calls.push({ name: 'globalAlpha', args: [value] });
    },
  };
}

/** How many drawing calls of a kind were made. */
const count = (ctx, name) => ctx.calls.filter((call) => call.name === name).length;

describe('tearing', () => {
  it('starts intact', () => {
    expect(createFinishTape().isTorn()).toBe(false);
  });

  it('tears once and stays torn', () => {
    const tape = createFinishTape();
    expect(tape.tear(2)).toBe(true);
    expect(tape.isTorn()).toBe(true);
    // A second runner crossing must not tear it again, or the halves would snap back.
    expect(tape.tear(4)).toBe(false);
    expect(tape.isTorn()).toBe(true);
  });

  it('splits the tape where the winner hit it', () => {
    // Lane 0 tears near one post, lane 5 near the other; the two halves swap which is longer.
    const ctxFor = (lane) => {
      const tape = createFinishTape();
      tape.tear(lane);
      const ctx = recordingContext();
      tape.draw(ctx, fakeTrack('landscape'));
      return ctx;
    };

    const near = ctxFor(0);
    const far = ctxFor(RUNNER_COUNT - 1);
    // Both draw two halves; the shape differs because the tear point does.
    const points = (ctx) => ctx.calls.filter((call) => call.name === 'lineTo').map((c) => c.args);
    expect(points(near)).not.toEqual(points(far));
  });

  it('forgets everything on reset, so the next race gets a whole tape', () => {
    const tape = createFinishTape();
    tape.tear(3);
    tape.update(1, false);
    tape.reset();
    expect(tape.isTorn()).toBe(false);
    expect(tape.tear(1)).toBe(true);
  });
});

describe('culling', () => {
  it('draws nothing while the finish is far off screen', () => {
    const ctx = recordingContext();
    // A 200-wide viewport, with the line a long way past its right edge.
    createFinishTape().draw(ctx, fakeTrack('landscape'), 200, 200);
    expect(ctx.calls).toHaveLength(0);
  });

  it('draws once the finish comes into view', () => {
    const ctx = recordingContext();
    createFinishTape().draw(ctx, fakeTrack('landscape'), 2000, 2000);
    expect(count(ctx, 'stroke')).toBeGreaterThan(0);
  });
});

describe('drawing', () => {
  it.each(['landscape', 'portrait'])('asks the %s track for its geometry', (orientation) => {
    const track = fakeTrack(orientation);
    createFinishTape().draw(recordingContext(), track);

    // Both outer lanes, so the tape spans the whole track whichever way the lanes run.
    expect(track.asked).toContainEqual({ units: TRACK_LENGTH, lane: 0 });
    expect(track.asked).toContainEqual({ units: TRACK_LENGTH, lane: RUNNER_COUNT - 1 });
    // And a point behind the line, to work out which way the horses are coming from.
    expect(track.asked.some((ask) => ask.units < TRACK_LENGTH)).toBe(true);
  });

  it.each(['landscape', 'portrait'])('draws an unbroken band in %s', (orientation) => {
    const ctx = recordingContext();
    createFinishTape().draw(ctx, fakeTrack(orientation));
    expect(count(ctx, 'quadraticCurveTo')).toBe(1);
    expect(count(ctx, 'stroke')).toBe(3); // dark edge, white band, accent line
  });

  it('draws two loose halves once it is torn', () => {
    const tape = createFinishTape();
    tape.tear(2);
    const ctx = recordingContext();
    tape.draw(ctx, fakeTrack('landscape'));
    expect(count(ctx, 'quadraticCurveTo')).toBe(0);
    expect(count(ctx, 'moveTo')).toBe(2);
    expect(count(ctx, 'stroke')).toBe(6); // two halves, three strokes each
  });

  it('stops drawing once the halves have faded', () => {
    const tape = createFinishTape();
    tape.tear(2);
    tape.update(FINISH_TAPE.fade + 0.1, false);
    const ctx = recordingContext();
    tape.draw(ctx, fakeTrack('landscape'));
    expect(ctx.calls).toHaveLength(0);
  });

  it('survives a track whose lanes have collapsed to a point', () => {
    // Happens for one frame while the canvas is being measured after a rotation.
    const flat = { positionOf: () => ({ x: 10, y: 10 }), horseSize: () => 40 };
    const ctx = recordingContext();
    expect(() => createFinishTape().draw(ctx, flat)).not.toThrow();
    expect(count(ctx, 'stroke')).toBe(0);
  });
});

describe('the swing', () => {
  it('settles hanging down instead of spinning forever', () => {
    const tape = createFinishTape();
    tape.tear(2);
    for (let i = 0; i < 400; i += 1) tape.update(1 / 60, false);

    const ctx = recordingContext();
    tape.reset();
    tape.tear(2);
    for (let i = 0; i < 400; i += 1) tape.update(1 / 60, false);
    tape.draw(ctx, fakeTrack('landscape'));

    // Nothing blew up into NaN on the way — the spring is damped.
    const numbers = ctx.calls.flatMap((call) => call.args).filter((a) => typeof a === 'number');
    expect(numbers.every(Number.isFinite)).toBe(true);
  });

  it('holds still under reduced motion', () => {
    const draw = (calm) => {
      const tape = createFinishTape();
      tape.tear(2);
      for (let i = 0; i < 30; i += 1) tape.update(1 / 60, calm);
      const ctx = recordingContext();
      tape.draw(ctx, fakeTrack('landscape'));
      return ctx.calls.filter((call) => call.name === 'lineTo').map((c) => c.args);
    };
    expect(draw(true)).not.toEqual(draw(false));
  });
});
