/**
 * Draws all six horses for one frame.
 *
 * Pulled out of the race screen because it is the one piece of that file which is purely about
 * rendering: it takes the interpolated positions and puts horses on the canvas, choosing the
 * side or rear drawing depending on which track is in play, and kicking up dust as hooves land.
 */

import { drawHorse } from './horse.js';
import { drawHorseRear } from './horseRear.js';
import { updatePose } from './horseAnimations.js';
import { HORSES } from '../data/horses.js';
import { EFFECTS, TRACK_LENGTH } from '../config.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {object[]} options.runners      live runner state from the engine
 * @param {Int32Array|number[]} options.lanes lane of each runner
 * @param {Float64Array} options.positions interpolated positions, in track units
 * @param {object[]} options.poses
 * @param {object[]} options.palettes
 * @param {object} options.track
 * @param {object} options.particles
 * @param {number} options.dt
 * @param {number} options.duration       target race duration, for the speed factor
 * @param {(runner: object) => string} options.animationFor
 * @param {boolean} options.running       dust only flies while the race is on
 * @param {boolean} [options.calm]        reduced motion: no streaks flying across the picture
 * @param {{width: number, height: number}} options.view
 */
export function drawField(
  ctx,
  {
    runners,
    lanes,
    positions,
    poses,
    palettes,
    track,
    particles,
    dt,
    duration,
    animationFor,
    running,
    calm = false,
    view,
  },
) {
  const baseSpeed = TRACK_LENGTH / duration;
  const drawOne = track.view === 'rear' ? drawHorseRear : drawHorse;

  // Furthest away first, so a nearer horse overlaps the one behind it.
  const order = [...runners].sort(
    (a, b) =>
      track.depthKey(positions[a.index], lanes[a.index]) -
      track.depthKey(positions[b.index], lanes[b.index]),
  );

  for (const runner of order) {
    const lane = lanes[runner.index];
    const pose = poses[runner.index];
    const speed = runner.v / baseSpeed;

    updatePose(pose, dt, { anim: animationFor(runner), speed: Math.max(0.15, speed) });

    const { x, y } = track.positionOf(positions[runner.index], lane);
    const size = track.horseSize(lane);
    const margin = size * 2.5;
    if (x < -margin || x > view.width + margin || y < -margin || y > view.height + margin) continue;

    const hoof = drawOne(ctx, {
      horse: HORSES[runner.index],
      colours: palettes[runner.index],
      pose,
      x,
      y,
      size,
    });
    if (pose.hoofStrike && running) particles.hoofDust(hoof.hoofX, hoof.hoofY, size, speed);
    // A horse that is genuinely flying drags streaks behind it. The threshold is the one the
    // engine already uses to switch to the fast gallop, so the picture and the animation agree.
    if (running && !calm && speed > EFFECTS.speedLineFromSpeed) {
      particles.speedLines(x - size * 0.5, y - size * 0.55, size, speed);
    }
  }
}
