/**
 * The tape across the finish line, and the moment the winner tears through it.
 *
 * It is decoration and nothing else: the engine has already decided the race long before the tape
 * knows anything, and the tear is driven by the *interpolated* drawing position, not by the
 * simulation. Nothing here can slow a horse down.
 *
 * The state lives outside the track on purpose. Rotating the device mid-race rebuilds the track
 * (see the race screen's resize), and a tape that forgot it had been torn would spring back
 * across the line while the winner is already celebrating.
 *
 * Geometry goes exclusively through `track.positionOf()`. It is the only public accessor that
 * works in both orientations — landscape keeps its lanes in `laneY`, portrait in a private
 * `laneCentre`, and neither is reachable from here.
 */

import { FINISH_TAPE, RUNNER_COUNT, TRACK_LENGTH } from '../config.js';
import { TRACK_COLOURS } from './trackTheme.js';

/** How far back along the track the direction of travel is sampled, in track units. */
const DIRECTION_SAMPLE = 20;

/**
 * One half of a torn tape: still nailed to its post, swinging down.
 * @param {number} sign -1 for the half towards lane 0, +1 for the other
 * @returns {object}
 */
function makeHalf(sign) {
  // `droop` runs 0 (still stretched towards the tear) to 1 (hanging straight down). Keeping it as
  // a fraction rather than an angle matters: the rest direction is only known at draw time, and a
  // spring that chased a screen angle it could not see would settle pointing sideways.
  return { sign, droop: 0, velocity: 0, length: 0, anchorX: 0, anchorY: 0 };
}

/**
 * The shortest way round from one angle to another.
 * @param {number} from
 * @param {number} to
 * @returns {number} signed difference in (-π, π]
 */
function shortestTurn(from, to) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * @returns {{update: Function, tear: Function, draw: Function, reset: Function, isTorn: () => boolean}}
 */
export function createFinishTape() {
  /** 'intact' until somebody runs through it. */
  let phase = 'intact';
  /** Seconds since the tear. */
  let since = 0;
  /** Where along the tape it tore, 0..1 — the lane the winner was running in. */
  let tearAt = 0.5;
  const halves = [makeHalf(-1), makeHalf(1)];

  return {
    /**
     * Advances the swing of the two halves.
     * @param {number} dt
     * @param {boolean} calm reduced motion: the tape goes slack instead of flying
     */
    update(dt, calm = false) {
      if (phase !== 'torn') return;
      since += dt;
      if (calm) return;

      for (const half of halves) {
        // A damped spring towards hanging down, with enough overshoot to look like cloth.
        const accel =
          (1 - half.droop) * FINISH_TAPE.stiffness - half.velocity * FINISH_TAPE.damping;
        half.velocity += accel * dt;
        half.droop += half.velocity * dt;
      }
    },

    /**
     * Somebody just crossed. Tears the tape where they hit it.
     * @param {number} lane the winner's lane, so the tape tears in the right place
     */
    tear(lane) {
      if (phase === 'torn') return false;
      phase = 'torn';
      since = 0;
      tearAt = (lane + 0.5) / RUNNER_COUNT;
      for (const half of halves) {
        half.droop = 0;
        // Flung by the runner going through, then gravity takes over.
        half.velocity = FINISH_TAPE.kick;
      }
      return true;
    },

    /** @returns {boolean} */
    isTorn() {
      return phase === 'torn';
    },

    /**
     * Draws the tape. Called after the horses, so an intact tape is in front of the field —
     * which is the whole point of a tape.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} track
     * @param {number} width canvas size in CSS pixels, for culling
     * @param {number} height
     */
    draw(ctx, track, width = Infinity, height = Infinity) {
      if (phase === 'torn' && since > FINISH_TAPE.fade) return;

      const ground = track.positionOf(TRACK_LENGTH, 0);
      // Chest height, not ankle height: a tape lying on the ground reads as a line painted on
      // the track. Raising it in screen space works in both orientations, because up is up.
      const first = raise(track, ground, 0);
      const last = raise(track, track.positionOf(TRACK_LENGTH, RUNNER_COUNT - 1), RUNNER_COUNT - 1);

      // The tape runs across the lanes; the runners come in at right angles to it.
      const acrossX = last.x - first.x;
      const acrossY = last.y - first.y;
      const span = Math.hypot(acrossX, acrossY);
      if (span < 1) return;

      // For most of a race the finish is nowhere near the screen. Six strokes a frame is not much,
      // but it is not nothing either (audit A5 counts path operations).
      const margin = span;
      const offScreen =
        Math.min(first.x, last.x) > width + margin ||
        Math.max(first.x, last.x) < -margin ||
        Math.min(first.y, last.y) > height + margin ||
        Math.max(first.y, last.y) < -margin;
      if (offScreen) return;
      const ux = acrossX / span;
      const uy = acrossY / span;

      // Reach a little past the outer lane centres, out to where the posts would be.
      const overhang = (span / (RUNNER_COUNT - 1)) * FINISH_TAPE.overhang;
      const startX = first.x - ux * overhang;
      const startY = first.y - uy * overhang;
      const total = span + overhang * 2;

      // Which way the horses are running, for the bow and the fling.
      const behind = track.positionOf(TRACK_LENGTH - DIRECTION_SAMPLE, 0);
      const runX = ground.x - behind.x;
      const runY = ground.y - behind.y;
      const runLength = Math.hypot(runX, runY) || 1;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = FINISH_TAPE.thickness;

      if (phase === 'intact') {
        drawIntact(ctx, { startX, startY, ux, uy, total, runX, runY, runLength });
      } else {
        const alpha = Math.max(0, 1 - since / FINISH_TAPE.fade);
        halves[0].length = total * tearAt;
        halves[1].length = total * (1 - tearAt);
        halves[0].anchorX = startX;
        halves[0].anchorY = startY;
        halves[1].anchorX = startX + ux * total;
        halves[1].anchorY = startY + uy * total;
        const carryX = runX / runLength;
        const carryY = runY / runLength;
        for (const half of halves) drawHalf(ctx, half, { ux, uy, alpha, since, carryX, carryY });
      }

      ctx.restore();
    },

    /** A new race gets a new tape. */
    reset() {
      phase = 'intact';
      since = 0;
      tearAt = 0.5;
      for (const half of halves) {
        half.droop = 0;
        half.velocity = 0;
      }
    },
  };
}

/**
 * The anchor point of one end of the tape: the outer lane at the line, lifted to chest height.
 * @param {object} track
 * @param {{x: number, y: number}} ground where that lane meets the line
 * @param {number} lane
 * @returns {{x: number, y: number}}
 */
function raise(track, ground, lane) {
  return { x: ground.x, y: ground.y - track.horseSize(lane) * FINISH_TAPE.height };
}

/**
 * The unbroken tape: a straight band with a little slack, bowed towards the oncoming field.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} geometry
 */
function drawIntact(ctx, { startX, startY, ux, uy, total, runX, runY, runLength }) {
  const bowX = (-runX / runLength) * FINISH_TAPE.bow;
  const bowY = (-runY / runLength) * FINISH_TAPE.bow;
  const midX = startX + ux * total * 0.5 + bowX;
  const midY = startY + uy * total * 0.5 + bowY;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(midX, midY, startX + ux * total, startY + uy * total);
  strokeBand(ctx);
}

/**
 * Strokes the current path three times: a dark edge so the band survives the chequerboard behind
 * it, the white band, and a thin accent down the middle so it reads as a band and not a scratch.
 * @param {CanvasRenderingContext2D} ctx
 */
function strokeBand(ctx) {
  ctx.lineWidth = FINISH_TAPE.thickness + 2;
  ctx.strokeStyle = TRACK_COLOURS.ink;
  ctx.stroke();
  ctx.lineWidth = FINISH_TAPE.thickness;
  ctx.strokeStyle = TRACK_COLOURS.white;
  ctx.stroke();
  ctx.lineWidth = FINISH_TAPE.thickness * 0.36;
  ctx.strokeStyle = TRACK_COLOURS.banner;
  ctx.stroke();
}

/**
 * One torn half, still on its post, fluttering as it falls.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} half
 * @param {object} options
 */
function drawHalf(ctx, half, { ux, uy, alpha, since, carryX, carryY }) {
  if (half.length < 2) return;

  // The half starts pointing from its post towards where the tear was and falls from there —
  // downwards, but carried along by the horse that went through it.
  const rest = Math.atan2(-uy * half.sign, -ux * half.sign);
  const settle = Math.atan2(1 + carryY * FINISH_TAPE.carry, carryX * FINISH_TAPE.carry);
  const angle = rest + shortestTurn(rest, settle) * half.droop;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  // Perpendicular, for the flutter.
  const normalX = -dirY;
  const normalY = dirX;

  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(half.anchorX, half.anchorY);
  const steps = 6;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const wave =
      Math.sin(t * Math.PI * FINISH_TAPE.waves - since * FINISH_TAPE.waveSpeed) *
      FINISH_TAPE.waveAmount *
      t;
    ctx.lineTo(
      half.anchorX + dirX * half.length * t + normalX * wave,
      half.anchorY + dirY * half.length * t + normalY * wave,
    );
  }
  strokeBand(ctx);
  ctx.globalAlpha = 1;
}
