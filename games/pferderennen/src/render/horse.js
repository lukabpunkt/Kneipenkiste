/**
 * Procedurally drawn horse, side view (landscape mode).
 *
 * Everything is paths — no bitmaps, so the horse scales freely and its colours come straight
 * from data/horses.js at draw time. Built from capsules with thick round caps, which is what
 * gives the cartoon look with very few operations (docs/04_DESIGN_SYSTEM.md §5.1).
 *
 * All geometry is in units of S, the body length, and the origin sits on the ground between the
 * hooves. The caller sets the transform; this module only draws.
 *
 * The rear view for portrait mode follows in M4.
 */

import { legAngles, bodyLift } from './horseAnimations.js';
import { capsule, OUTLINE } from './shapes.js';
import { quality } from './quality.js';
import { drawTack, drawJockey, drawSaddleAccessory, drawHeadAccessory } from './horseTack.js';

/** Where the legs hang from, and how long their two segments are. */
const HIP = { x: -0.29, y: -0.6 };
const SHOULDER = { x: 0.27, y: -0.63 };
const THIGH = 0.3;
const SHANK = 0.31;

/** Stride offsets of the four legs: hind pair first, then the front pair. */
const LEGS = [
  { at: HIP, offset: 0.0, front: false, far: true },
  { at: SHOULDER, offset: 0.46, front: true, far: true },
  { at: HIP, offset: 0.13, front: false, far: false },
  { at: SHOULDER, offset: 0.58, front: true, far: false },
];

/**
 * The knee and hoof of one leg.
 * @returns {{kneeX: number, kneeY: number, hoofX: number, hoofY: number}}
 */
function legJoints(at, thigh, shank) {
  const kneeX = at.x + Math.sin(thigh) * THIGH;
  const kneeY = at.y + Math.cos(thigh) * THIGH;
  return {
    kneeX,
    kneeY,
    hoofX: kneeX + Math.sin(shank) * SHANK,
    hoofY: kneeY + Math.cos(shank) * SHANK,
  };
}

/** Draws one leg, outline first so the fill sits inside it. */
function drawLeg(ctx, leg, pose, colours, far) {
  const { thigh, shank } = legAngles(pose.phase, leg.offset, pose.swing, leg.front);
  const { kneeX, kneeY, hoofX, hoofY } = legJoints(leg.at, thigh, shank);
  const coat = far ? colours.coatDark : colours.coat;
  const line = far ? colours.coatDarker : colours.coatDark;

  capsule(ctx, leg.at.x, leg.at.y, kneeX, kneeY, 0.15 + OUTLINE, line);
  capsule(ctx, kneeX, kneeY, hoofX, hoofY, 0.105 + OUTLINE, line);
  capsule(ctx, leg.at.x, leg.at.y, kneeX, kneeY, 0.15, coat);
  capsule(ctx, kneeX, kneeY, hoofX, hoofY, 0.105, coat);

  // The hoof itself, a touch darker so the leg reads as having a foot.
  capsule(ctx, hoofX, hoofY - 0.01, hoofX + 0.045, hoofY - 0.005, 0.1, line);
  return { hoofX, hoofY };
}

/**
 * Draws the flowing hair of mane or tail as a tapering chain.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Float64Array} angles
 */
function drawHair(ctx, angles, startX, startY, segment, width, colour, baseAngle) {
  let x = startX;
  let y = startY;
  let angle = baseAngle;

  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  for (let i = 0; i < angles.length; i += 1) {
    angle += angles[i];
    const nextX = x + Math.cos(angle) * segment;
    const nextY = y - Math.sin(angle) * segment;
    ctx.lineWidth = width * (1 - i / (angles.length + 1));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();
    x = nextX;
    y = nextY;
  }
}

/**
 * The body. Not an ellipse but a silhouette with a chest, a dipped back and a rounded rump —
 * that outline is most of what makes it read as a horse rather than a barrel on legs.
 */
function drawBody(ctx, colours) {
  ctx.beginPath();
  ctx.moveTo(0.4, -0.79);
  // over the withers and along the back to the rump
  ctx.bezierCurveTo(0.3, -0.97, 0.1, -1.0, -0.16, -0.99);
  ctx.bezierCurveTo(-0.32, -0.99, -0.44, -0.94, -0.47, -0.82);
  // round the rump and down to the hind leg
  ctx.bezierCurveTo(-0.5, -0.72, -0.48, -0.63, -0.42, -0.58);
  // the belly
  ctx.bezierCurveTo(-0.24, -0.51, 0.14, -0.5, 0.34, -0.56);
  // up the chest, back to the start
  ctx.bezierCurveTo(0.44, -0.6, 0.46, -0.69, 0.4, -0.79);
  ctx.closePath();

  ctx.strokeStyle = colours.coatDark;
  ctx.lineWidth = OUTLINE * 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // A gradient per horse per frame is the single most expensive thing here, so it is the first
  // thing to go when the quality drops.
  if (quality.level === 'low') {
    ctx.fillStyle = colours.coat;
  } else {
    const gradient = ctx.createLinearGradient(0, -1.02, 0, -0.5);
    gradient.addColorStop(0, colours.coatLight);
    gradient.addColorStop(0.5, colours.coat);
    gradient.addColorStop(1, colours.coatDark);
    ctx.fillStyle = gradient;
  }
  ctx.fill();
}

/**
 * Neck and head. The neck is a filled shape rather than a capsule so it can taper, and the head
 * points forward and slightly down — a horse at a gallop reaches, it does not stargaze.
 */
function drawHeadAndNeck(ctx, pose, colours, horse) {
  const reach = pose.neck;
  // Poll: the top of the neck, just behind the ears.
  const pollX = 0.42 + 0.09 * reach;
  const pollY = -1.12 - 0.06 * reach + pose.headPitch * 0.22;

  ctx.beginPath();
  ctx.moveTo(0.14, -0.98);
  ctx.bezierCurveTo(0.26, -1.05, pollX - 0.12, pollY - 0.02, pollX, pollY);
  ctx.lineTo(pollX + 0.1, pollY + 0.11);
  ctx.bezierCurveTo(pollX - 0.02, pollY + 0.18, 0.42, -0.86, 0.4, -0.76);
  ctx.closePath();
  ctx.strokeStyle = colours.coatDark;
  ctx.lineWidth = OUTLINE * 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = colours.coat;
  ctx.fill();

  ctx.save();
  ctx.translate(pollX, pollY);
  ctx.rotate(0.42 + pose.headPitch);

  // Skull into muzzle, one tapering shape.
  capsule(ctx, 0, 0.02, 0.2, 0.09, 0.19 + OUTLINE, colours.coatDark);
  capsule(ctx, 0, 0.02, 0.2, 0.09, 0.19, colours.coat);
  capsule(ctx, 0.15, 0.08, 0.22, 0.1, 0.14, colours.coatLight);

  // Ear.
  ctx.fillStyle = colours.coat;
  ctx.strokeStyle = colours.coatDark;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.05);
  ctx.quadraticCurveTo(-0.06, -0.21, 0.04, -0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye: white, iris, highlight. Closes to a line when blinking.
  if (pose.eye > 0.15) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0.075, 0.0, 0.045, 0.041 * pose.eye, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colours.ink;
    ctx.beginPath();
    ctx.ellipse(0.087, 0.005, 0.025, 0.029 * pose.eye, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0.098, -0.007, 0.011, 0, Math.PI * 2);
    ctx.fill();
  } else {
    capsule(ctx, 0.045, 0.0, 0.115, 0.008, 0.018, colours.coatDark);
  }

  // Nostril.
  ctx.fillStyle = colours.coatDark;
  ctx.beginPath();
  ctx.ellipse(0.22, 0.09, 0.02, 0.014, 0.3, 0, Math.PI * 2);
  ctx.fill();

  drawHeadAccessory(ctx, horse.accessory, horse);
  ctx.restore();

  // The bit sits at the front of the muzzle; the rein runs from here to the jockey's hands.
  const angle = 0.42 + pose.headPitch;
  return {
    pollX,
    pollY,
    bitX: pollX + Math.cos(angle) * 0.2 - Math.sin(angle) * 0.09,
    bitY: pollY + Math.sin(angle) * 0.2 + Math.cos(angle) * 0.09,
  };
}

/**
 * Draws one horse.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {object} options.horse   entry from data/horses.js
 * @param {object} options.colours from horseColours()
 * @param {object} options.pose    from horseAnimations.js
 * @param {number} options.x       screen position of the hooves
 * @param {number} options.y
 * @param {number} options.size    body length in pixels
 * @returns {{hoofX: number, hoofY: number}} where the near hind hoof landed, for the dust
 */
export function drawHorse(ctx, { horse, colours, pose, x, y, size }) {
  const lift = bodyLift(pose) + pose.rear * 0.05;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);

  // Shadow first, on the ground, shrinking as the horse leaves it.
  const grounded = 1 - Math.min(1, lift * 6);
  ctx.fillStyle = `rgba(43, 29, 46, ${0.16 + 0.12 * grounded})`;
  ctx.beginPath();
  ctx.ellipse(0, -0.02, 0.46 * (0.72 + 0.28 * grounded), 0.075, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -lift);
  // The banana slip spins the whole horse; multiplying by `spin` fades the rotation out with
  // the state, so it never snaps back upright.
  if (pose.spin > 0.02) ctx.rotate(pose.spinAngle * pose.spin);
  // Turning round is a horizontal squash through zero and out the other side — the classic
  // two-dimensional way to face the other way without a second sprite.
  if (pose.turn > 0.02) {
    const facing = Math.cos(pose.turn * Math.PI);
    ctx.scale(Math.abs(facing) < 0.12 ? Math.sign(facing) * 0.12 || 0.12 : facing, 1);
  }
  ctx.rotate(-pose.lean - pose.rear * 0.55);

  // Far legs sit behind everything, in a darker shade so the depth reads.
  for (const leg of LEGS) if (leg.far) drawLeg(ctx, leg, pose, colours, true);

  // Tail: hangs down at rest, streams out flat when the horse is running. Drawn before the
  // body so it sits behind the rump.
  const tailBase = Math.PI + 1.35 - 0.95 * Math.min(1, pose.stream);
  drawHair(ctx, pose.tail, -0.45, -0.9, 0.115, 0.095, colours.mane, tailBase);
  drawBody(ctx, colours);

  const nearHind = drawLeg(ctx, LEGS[2], pose, colours, false);
  const head = drawHeadAndNeck(ctx, pose, colours, horse);
  // Mane along the crest, streaming back from behind the ears.
  drawHair(
    ctx,
    pose.mane,
    head.pollX - 0.04,
    head.pollY + 0.01,
    0.085,
    0.1,
    colours.mane,
    Math.PI + 0.4,
  );

  drawTack(ctx, horse, head);
  drawSaddleAccessory(ctx, horse.accessory);

  // Once the jockey has come off, the horse carries on without him — and without the reins.
  if (!pose.riderless) {
    const jockey = drawJockey(ctx, horse, pose, colours);
    capsule(ctx, head.bitX, head.bitY, jockey.handX, jockey.handY, 0.018, colours.ink);
  }

  drawLeg(ctx, LEGS[3], pose, colours, false);

  ctx.restore();
  return { hoofX: x + nearHind.hoofX * size, hoofY: y + nearHind.hoofY * size };
}
