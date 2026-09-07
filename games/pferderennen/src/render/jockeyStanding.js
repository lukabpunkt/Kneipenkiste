/**
 * A jockey standing up, for the podium.
 *
 * The jockey that exists already (`drawJockey` in horseTack.js) is a riding pose and nothing
 * else: crouched over the withers, one leg tucked, one arm reaching down the neck. None of that
 * works once he is off the horse and up on a plinth, so this is a second figure — but built from
 * the same parts, in the same units, and wearing the same silks and headgear, so the two read as
 * the same person.
 *
 * Units are the horse's: 1 is a body length, the origin is between the feet, y goes up as it
 * goes negative. That is what lets a jockey and his horse be drawn at the same `size`.
 */

import { capsule, OUTLINE } from './shapes.js';
import { drawJockeyHeadgear } from './horseTack.js';

/** Where the head sits in local units. The headgear is aligned to it. */
const HEAD = { x: 0, y: -0.62, radius: 0.078 };
/** Where `drawJockeyHeadgear` expects to find the head, in the riding jockey's frame. */
const HEADGEAR_ANCHOR = { x: 0.05, y: -0.28 };

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {object} options.horse    entry from data/horses.js
 * @param {object} options.colours  from horseColours()
 * @param {number} options.x        screen position of the feet
 * @param {number} options.y
 * @param {number} options.size     the same body-length scale a horse is drawn at
 * @param {number} [options.cheer]  0 arms down, 1 both arms up
 * @param {number} [options.bob]    small vertical bounce, in local units
 */
export function drawStandingJockey(ctx, { horse, colours, x, y, size, cheer = 0, bob = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.translate(0, -bob);
  ctx.lineCap = 'round';

  // Boots and breeches.
  capsule(ctx, -0.055, -0.32, -0.06, -0.1, 0.062, colours.white);
  capsule(ctx, 0.055, -0.32, 0.062, -0.1, 0.062, colours.white);
  capsule(ctx, -0.06, -0.11, -0.062, 0, 0.07, colours.ink);
  capsule(ctx, 0.062, -0.11, 0.064, 0, 0.07, colours.ink);

  // Silks.
  ctx.fillStyle = horse.color;
  ctx.strokeStyle = horse.colorDark;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(-0.098, -0.56, 0.196, 0.26, 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colours.silkStripe;
  ctx.fillRect(-0.028, -0.56, 0.046, 0.26);

  drawArms(ctx, horse, cheer);

  // Head, cap and goggles pushed up — the race is over.
  ctx.fillStyle = colours.skin;
  ctx.beginPath();
  ctx.arc(HEAD.x, HEAD.y, HEAD.radius, 0, Math.PI * 2);
  ctx.fill();
  // The cap sits high enough to leave a face; a cap the size of the head is just a helmet.
  ctx.fillStyle = horse.colorDark;
  ctx.beginPath();
  ctx.arc(HEAD.x, HEAD.y - 0.034, 0.08, Math.PI * 0.98, Math.PI * 2.02);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(HEAD.x + 0.052, HEAD.y - 0.05, 0.056, 0.024, 0.012);
  ctx.fill();
  // Goggles pushed up onto the brow — the race is over.
  ctx.fillStyle = colours.ink;
  ctx.beginPath();
  ctx.roundRect(HEAD.x - 0.056, HEAD.y - 0.048, 0.112, 0.026, 0.012);
  ctx.fill();

  // The accessory is what tells the six apart, so it comes along off the horse too.
  ctx.save();
  ctx.translate(HEAD.x - HEADGEAR_ANCHOR.x, HEAD.y - HEADGEAR_ANCHOR.y);
  drawJockeyHeadgear(ctx, horse.accessory, horse);
  ctx.restore();

  ctx.restore();
}

/**
 * Both arms, swinging from hanging at the sides up over the head.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} horse
 * @param {number} cheer
 */
function drawArms(ctx, horse, cheer) {
  const shoulderY = -0.53;
  // Down at the side is a quarter turn down and out; up is nearly straight above.
  const angle = Math.PI * 0.36 - cheer * Math.PI * 0.63;
  const reach = 0.24;

  for (const side of [-1, 1]) {
    const shoulderX = 0.086 * side;
    capsule(
      ctx,
      shoulderX,
      shoulderY,
      shoulderX + Math.cos(angle) * reach * side,
      shoulderY + Math.sin(angle) * reach,
      0.052,
      horse.colorDark,
    );
  }
}
