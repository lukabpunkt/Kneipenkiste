/**
 * The horse seen from behind and slightly above — the portrait view.
 *
 * This exists for one reason: on a phone you have to find your horse in a fraction of a second.
 * From behind, the saddle cloth and the jockey's silks face straight at you, which is the largest
 * patch of the signature colour the horse can possibly show, and the starting number sits right
 * in the middle of it (docs/04_DESIGN_SYSTEM.md §5.4).
 *
 * The pose is the same one the side view uses, so both stay in step: the same integrated gallop
 * phase drives the bob, the roll and the legs.
 */

import { bodyLift, legAngles } from './horseAnimations.js';
import { capsule, OUTLINE } from './shapes.js';
import { quality } from './quality.js';

/** How far the body rolls from side to side over a stride, in radians. */
const ROLL = 0.07;

/**
 * Draws one horse from behind.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {object} options.horse   entry from data/horses.js
 * @param {object} options.colours from horseColours()
 * @param {object} options.pose    from horseAnimations.js
 * @param {number} options.x       screen position of the hooves
 * @param {number} options.y
 * @param {number} options.size    body length in pixels, the same figure the side view uses
 * @returns {{hoofX: number, hoofY: number}} where a hind hoof landed, for the dust
 */
export function drawHorseRear(ctx, { horse, colours, pose, x, y, size }) {
  const lift = bodyLift(pose) + pose.rear * 0.05;
  const roll = Math.sin(pose.phase * Math.PI * 2) * ROLL;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  // Shadow on the ground, shrinking as the horse leaves it.
  const grounded = 1 - Math.min(1, lift * 6);
  ctx.fillStyle = `rgba(43, 29, 46, ${0.16 + 0.12 * grounded})`;
  ctx.beginPath();
  ctx.ellipse(0, -0.02, 0.4 * (0.72 + 0.28 * grounded), 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -lift);
  if (pose.spin > 0.02) ctx.rotate(pose.spinAngle * pose.spin);
  if (pose.turn > 0.02) {
    const facing = Math.cos(pose.turn * Math.PI);
    ctx.scale(Math.abs(facing) < 0.12 ? Math.sign(facing) * 0.12 || 0.12 : facing, 1);
  }
  ctx.rotate(roll);

  // --- Head and neck, receding away above the jockey ------------------------
  // Seen from behind and above, the neck runs away from the viewer and the head sits small and
  // high, clear of the jockey's helmet. Drawn first, so everything nearer overlaps it.
  const reach = 1 + pose.neck * 0.05;
  // The neck has to stay visible above the jockey's helmet, otherwise the head looks like it is
  // growing out of the rider.
  capsule(ctx, 0, -1.78 * reach, 0, -1.15, 0.16, colours.coatDark);
  ctx.fillStyle = colours.coat;
  ctx.beginPath();
  ctx.ellipse(0, -1.87 * reach, 0.11, 0.125, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colours.coatDark;
  ctx.lineWidth = OUTLINE * 0.8;
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.fillStyle = colours.coat;
    ctx.beginPath();
    ctx.ellipse(side * 0.082, -1.98 * reach, 0.031, 0.053, side * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // --- Legs. Far pair first, then the body, then the near pair --------------
  drawLegPair(ctx, pose, colours, true);

  // --- Hindquarters: the big rounded shape that fills most of the sprite -----
  ctx.beginPath();
  ctx.moveTo(-0.3, -1.0);
  ctx.bezierCurveTo(-0.41, -0.86, -0.43, -0.58, -0.3, -0.36);
  ctx.bezierCurveTo(-0.16, -0.27, 0.16, -0.27, 0.3, -0.36);
  ctx.bezierCurveTo(0.43, -0.58, 0.41, -0.86, 0.3, -1.0);
  ctx.bezierCurveTo(0.16, -1.07, -0.16, -1.07, -0.3, -1.0);
  ctx.closePath();
  ctx.strokeStyle = colours.coatDark;
  ctx.lineWidth = OUTLINE * 1.4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (quality.level === 'low') {
    ctx.fillStyle = colours.coat;
  } else {
    const shading = ctx.createLinearGradient(-0.43, 0, 0.43, 0);
    shading.addColorStop(0, colours.coatDark);
    shading.addColorStop(0.38, colours.coat);
    shading.addColorStop(0.62, colours.coatLight);
    shading.addColorStop(1, colours.coatDark);
    ctx.fillStyle = shading;
  }
  ctx.fill();

  // Tail down the middle of the croup, swinging with the stride. It starts below the saddle
  // cloth, otherwise its first two segments would simply be hidden behind it.
  const sway = Math.sin(pose.phase * Math.PI * 2 + 0.8) * 0.09 + pose.tail[0] * 0.35;
  ctx.strokeStyle = colours.mane;
  ctx.lineCap = 'round';
  let tailX = 0;
  let tailY = -0.82;
  for (let i = 0; i < 4; i += 1) {
    const nextX = tailX + sway * (0.4 + i * 0.28);
    const nextY = tailY + 0.15;
    ctx.lineWidth = 0.115 * (1 - i * 0.17);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();
    tailX = nextX;
    tailY = nextY;
  }

  // --- Saddle cloth: the reason this view exists ----------------------------
  ctx.fillStyle = horse.color;
  ctx.strokeStyle = horse.colorDark;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(-0.29, -1.08, 0.58, 0.32, 0.08);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colours.white;
  ctx.font = '0.27px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(horse.number), 0, -0.91);

  // --- Jockey from behind ---------------------------------------------------
  const bob = Math.sin(pose.phase * Math.PI * 2 + Math.PI) * 0.02;
  if (pose.riderless) {
    const hoofOnly = drawLegPair(ctx, pose, colours, false);
    ctx.restore();
    return { hoofX: x + hoofOnly.x * size, hoofY: y + hoofOnly.y * size };
  }
  ctx.save();
  ctx.translate(0, -1.06 + bob);

  // Arms out to the sides, holding the reins.
  capsule(ctx, -0.13, -0.17, -0.23, -0.04, 0.07, horse.colorDark);
  capsule(ctx, 0.13, -0.17, 0.23, -0.04, 0.07, horse.colorDark);

  ctx.fillStyle = horse.color;
  ctx.strokeStyle = horse.colorDark;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(-0.16, -0.32, 0.32, 0.32, 0.1);
  ctx.fill();
  ctx.stroke();
  // The same stripe as the side view, so the two silks read as one outfit.
  ctx.fillStyle = colours.silkStripe;
  ctx.fillRect(-0.04, -0.32, 0.08, 0.32);

  // Helmet.
  ctx.fillStyle = horse.colorDark;
  ctx.beginPath();
  ctx.arc(0, -0.4, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colours.silkStripe;
  ctx.beginPath();
  ctx.arc(0, -0.42, 0.05, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const hoof = drawLegPair(ctx, pose, colours, false);

  ctx.restore();
  return { hoofX: x + hoof.x * size, hoofY: y + hoof.y * size };
}

/**
 * Draws the two hind legs on one side of the body.
 *
 * From behind you mostly see them swing out and back rather than reach forward, so the side
 * view's joint angles are reused but applied sideways.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} pose
 * @param {object} colours
 * @param {boolean} far the pair behind the body, drawn darker
 * @returns {{x: number, y: number}} the lower hoof, for the dust
 */
function drawLegPair(ctx, pose, colours, far) {
  const coat = far ? colours.coatDark : colours.coat;
  const line = far ? colours.coatDarker : colours.coatDark;
  const offset = far ? 0.5 : 0;
  let lowest = { x: 0, y: -1 };

  for (const side of [-1, 1]) {
    const { thigh } = legAngles(pose.phase, offset + (side < 0 ? 0 : 0.13), pose.swing, false);
    // Seen from behind, the reach turns into a sideways swing plus a lift.
    const swing = thigh * 0.5;
    const hipX = side * 0.17;
    // Hind legs seen from behind stay close together; only the swing takes them out sideways.
    const kneeX = hipX + side * 0.03 + swing * 0.18;
    const kneeY = -0.32 + Math.abs(thigh) * 0.06;
    const hoofX = kneeX + side * 0.02 + swing * 0.16;
    const hoofY = -0.02 - Math.max(0, thigh) * 0.26;

    capsule(ctx, hipX, -0.58, kneeX, kneeY, 0.16 + OUTLINE, line);
    capsule(ctx, kneeX, kneeY, hoofX, hoofY, 0.115 + OUTLINE, line);
    capsule(ctx, hipX, -0.58, kneeX, kneeY, 0.16, coat);
    capsule(ctx, kneeX, kneeY, hoofX, hoofY, 0.115, coat);
    // The hoof, a shade darker so the leg reads as having a foot.
    capsule(ctx, hoofX - 0.02, hoofY, hoofX + 0.02, hoofY, 0.09, line);

    if (!far && hoofY > lowest.y) lowest = { x: hoofX, y: hoofY };
  }
  return lowest;
}
