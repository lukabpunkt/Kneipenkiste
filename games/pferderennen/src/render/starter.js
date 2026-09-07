/**
 * The starter beside the gates: raises the pistol through the countdown and fires it at "LOS!".
 *
 * Drawn in screen pixels like the gates and the event props, not in the horses' normalised frame,
 * because it belongs to the track furniture rather than to a horse. The camera carries it out of
 * shot on its own once the field sets off, which is exactly what should happen — nobody watches
 * the starter after the start.
 */

import { STARTER } from '../config.js';
import { TRACK_COLOURS } from './trackTheme.js';

/** Skin and clothing, matching the figures in eventProps.js. */
const SKIN = '#F2C9A0';
const COAT = '#1F2937';
const STEEL = '#4B5563';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {number} options.x       ground position of the feet
 * @param {number} options.y
 * @param {number} options.size    height of the figure in pixels
 * @param {number} options.raise   0 arm down, 1 arm straight up
 * @param {number} options.since   seconds since the shot, or -1 before it
 * @param {boolean} [options.calm] reduced motion: no muzzle flash
 */
export function drawStarter(ctx, { x, y, size, raise, since, calm = false }) {
  const s = size;
  // A little recoil that runs out over a fifth of a second.
  const kick = since >= 0 ? Math.max(0, 1 - since / STARTER.recoilSeconds) : 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';

  // The box the starter stands on, so the figure clears the rail.
  ctx.fillStyle = TRACK_COLOURS.wood;
  ctx.beginPath();
  ctx.roundRect(-s * 0.22, 0, s * 0.44, s * 0.16, s * 0.03);
  ctx.fill();

  ctx.translate(0, -s * 0.16 + kick * s * 0.02);

  // Legs.
  ctx.strokeStyle = COAT;
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -s * 0.3);
  ctx.lineTo(-s * 0.08, 0);
  ctx.moveTo(s * 0.05, -s * 0.3);
  ctx.lineTo(s * 0.09, 0);
  ctx.stroke();

  // Coat.
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.roundRect(-s * 0.11, -s * 0.62, s * 0.22, s * 0.34, s * 0.06);
  ctx.fill();

  // The free arm hangs; the other one holds the pistol.
  ctx.strokeStyle = COAT;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(-s * 0.09, -s * 0.55);
  ctx.lineTo(-s * 0.14, -s * 0.34);
  ctx.stroke();

  // Head and cap.
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0, -s * 0.72, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TRACK_COLOURS.banner;
  ctx.beginPath();
  ctx.arc(0, -s * 0.74, s * 0.108, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(s * 0.02, -s * 0.78, s * 0.13, s * 0.035, s * 0.017);
  ctx.fill();

  drawArmAndPistol(ctx, s, raise, since, kick, calm);
  ctx.restore();
}

/**
 * The shooting arm, the pistol, and whatever is coming out of it.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} s figure height
 * @param {number} raise
 * @param {number} since
 * @param {number} kick
 * @param {boolean} calm
 */
function drawArmAndPistol(ctx, s, raise, since, kick, calm) {
  const shoulderX = s * 0.09;
  const shoulderY = -s * 0.55;
  // Straight down, up over the back, straight up. Deliberately the long way round: swinging the
  // arm forward would point the pistol across the track at the horses on the way past.
  const angle = Math.PI * 0.5 + raise * Math.PI + kick * 0.16;
  const armLength = s * 0.32;
  const handX = shoulderX + Math.cos(angle) * armLength;
  const handY = shoulderY + Math.sin(angle) * armLength;

  ctx.strokeStyle = COAT;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);

  // The pistol: a stubby barrel pointing the way the arm does.
  ctx.fillStyle = STEEL;
  ctx.beginPath();
  ctx.roundRect(-s * 0.02, -s * 0.035, s * 0.16, s * 0.055, s * 0.015);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-s * 0.02, -s * 0.01, s * 0.05, s * 0.09, s * 0.015);
  ctx.fill();

  if (since >= 0 && since < STARTER.flashSeconds && !calm) {
    drawMuzzleFlash(ctx, s, since / STARTER.flashSeconds);
  }
  ctx.restore();
}

/**
 * The flash at the muzzle: a short white star that opens and goes out.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} s
 * @param {number} t 0..1 through the flash
 */
function drawMuzzleFlash(ctx, s, t) {
  const reach = s * (0.1 + t * 0.16);
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = TRACK_COLOURS.white;
  ctx.beginPath();
  for (let i = 0; i < STARTER.flashSpikes * 2; i += 1) {
    const angle = (i / (STARTER.flashSpikes * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? reach : reach * 0.36;
    const px = s * 0.17 + Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
