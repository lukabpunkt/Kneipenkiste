/**
 * Everything the rider brings: saddle cloth, saddle, bridle, the jockey, and the accessories.
 *
 * Accessories sit where the game design document puts them (§2): the knight helmet and the
 * ushanka on the jockey, the sunglasses on the horse, the clover on the bridle, and the mug and
 * the pretzel on the saddle. Together with the coat and the silks they are what tells the six
 * horses apart even in greyscale, which audit A4 asks for.
 *
 * All geometry is in units of the body length, in the horse's own frame.
 */

import { capsule, OUTLINE } from './shapes.js';

/** Saddle cloth with the starting number, saddle, and the browband of the bridle. */
export function drawTack(ctx, horse, head) {
  ctx.fillStyle = horse.color;
  ctx.strokeStyle = horse.colorDark;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(-0.26, -0.94, 0.32, 0.28, 0.06);
  ctx.fill();
  ctx.stroke();

  // The number, so a horse is identifiable without relying on colour alone (audit A4).
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '0.2px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(horse.number), -0.1, -0.79);

  ctx.fillStyle = horse.colorDark;
  ctx.beginPath();
  ctx.roundRect(-0.12, -1.0, 0.22, 0.1, 0.045);
  ctx.fill();

  // Browband, in the signature colour.
  capsule(
    ctx,
    head.pollX + 0.02,
    head.pollY + 0.08,
    head.pollX + 0.1,
    head.pollY + 0.14,
    0.03,
    horse.color,
  );
}

/**
 * The jockey: crouched forward over the withers in the silks, which is where most of the
 * signature colour lives. Bobs counter to the horse, so the two do not move as one lump.
 * @returns {{handX: number, handY: number}} where the reins are held
 */
export function drawJockey(ctx, horse, pose, colours) {
  const lift = Math.sin(pose.phase * Math.PI * 2 + Math.PI) * 0.02 * (pose.bounce / 0.075);
  const seatX = -0.05;
  const seatY = -1.0 + lift;

  ctx.save();
  ctx.translate(seatX, seatY);
  // Positive rotation tips the top forward — a jockey leans into the race.
  ctx.rotate(0.32 + pose.lean * 1.2 - pose.rear * 0.5);

  // Leg tucked up along the horse's side.
  capsule(ctx, 0.0, 0.02, 0.12, 0.12, 0.09, horse.colorDark);
  capsule(ctx, 0.12, 0.12, 0.16, 0.02, 0.07, colours.ink);

  // Torso in the silks.
  ctx.fillStyle = horse.color;
  ctx.strokeStyle = horse.colorDark;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.roundRect(-0.11, -0.19, 0.22, 0.23, 0.08);
  ctx.fill();
  ctx.stroke();
  // A light stripe, so two close colours still separate at a glance.
  ctx.fillStyle = colours.silkStripe;
  ctx.fillRect(-0.03, -0.19, 0.05, 0.23);

  // Arm reaching down the neck to the reins.
  const handX = 0.2;
  const handY = -0.02;
  capsule(ctx, 0.05, -0.1, handX, handY, 0.06, horse.colorDark);

  // Head and cap.
  ctx.fillStyle = colours.skin;
  ctx.beginPath();
  ctx.arc(0.05, -0.26, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = horse.colorDark;
  ctx.beginPath();
  ctx.arc(0.05, -0.28, 0.088, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(0.1, -0.3, 0.08, 0.032, 0.016);
  ctx.fill();

  // Goggles.
  ctx.fillStyle = colours.ink;
  ctx.beginPath();
  ctx.roundRect(0.06, -0.28, 0.07, 0.035, 0.015);
  ctx.fill();

  drawJockeyHeadgear(ctx, horse.accessory, horse);

  const matrix = ctx.getTransform();
  ctx.restore();
  // Hand position back in horse coordinates, for the rein.
  return {
    handX:
      seatX + (handX * Math.cos(0.32 + pose.lean * 1.2) - handY * Math.sin(0.32 + pose.lean * 1.2)),
    handY:
      seatY + (handX * Math.sin(0.32 + pose.lean * 1.2) + handY * Math.cos(0.32 + pose.lean * 1.2)),
    matrix,
  };
}

/**
 * Accessories sit where the game design document puts them: the knight helmet and the ushanka
 * on the jockey, the sunglasses on the horse, the clover on the bridle, and the mug and pretzel
 * on the saddle. They are what tells the six apart in greyscale (audit A4).
 */

/** Headgear worn by the jockey, drawn in the jockey's own frame over the cap. */
export function drawJockeyHeadgear(ctx, accessory, horse) {
  if (accessory === 'knightHelmet') {
    ctx.fillStyle = '#C9CDD6';
    ctx.strokeStyle = '#8A8F9B';
    ctx.lineWidth = OUTLINE;
    ctx.beginPath();
    ctx.arc(0.05, -0.28, 0.092, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.stroke();
    // Visor slit and a little plume.
    ctx.fillStyle = '#6B7280';
    ctx.beginPath();
    ctx.roundRect(0.06, -0.29, 0.08, 0.026, 0.012);
    ctx.fill();
    ctx.strokeStyle = horse.color;
    ctx.lineWidth = 0.028;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.02, -0.37);
    ctx.quadraticCurveTo(-0.06, -0.42, -0.1, -0.33);
    ctx.stroke();
  } else if (accessory === 'ushanka') {
    ctx.fillStyle = '#7A6B82';
    ctx.strokeStyle = '#5A4D61';
    ctx.lineWidth = OUTLINE;
    ctx.beginPath();
    ctx.arc(0.05, -0.28, 0.098, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.stroke();
    // Ear flap.
    ctx.beginPath();
    ctx.roundRect(-0.04, -0.3, 0.062, 0.12, 0.028);
    ctx.fill();
    ctx.stroke();
  }
}

/** Accessories worn by the horse itself, drawn in the head's frame. */
export function drawHeadAccessory(ctx, accessory, horse) {
  if (accessory === 'sunglasses') {
    ctx.fillStyle = '#2B1D2E';
    ctx.strokeStyle = horse.colorDark;
    ctx.lineWidth = OUTLINE * 0.8;
    ctx.beginPath();
    ctx.roundRect(0.02, -0.045, 0.115, 0.075, 0.028);
    ctx.fill();
    ctx.stroke();
    // A glint, so it reads as glass rather than a hole.
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.016;
    ctx.beginPath();
    ctx.moveTo(0.045, 0.012);
    ctx.lineTo(0.075, -0.022);
    ctx.stroke();
  } else if (accessory === 'clover') {
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = OUTLINE * 0.7;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0.14, 0.14, 0.034, 0.021, (i * Math.PI) / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** Accessories strapped to the saddle, drawn in the horse's frame. */
export function drawSaddleAccessory(ctx, accessory) {
  if (accessory === 'coffeeMug') {
    ctx.fillStyle = '#FFF8EE';
    ctx.strokeStyle = '#6B5B73';
    ctx.lineWidth = OUTLINE;
    ctx.beginPath();
    ctx.roundRect(-0.36, -0.92, 0.1, 0.12, 0.022);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-0.245, -0.865, 0.035, -1.2, 1.2);
    ctx.stroke();
    // Coffee.
    ctx.fillStyle = '#4A2717';
    ctx.beginPath();
    ctx.ellipse(-0.31, -0.915, 0.042, 0.014, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (accessory === 'pretzel') {
    ctx.strokeStyle = '#B4762F';
    ctx.lineWidth = 0.042;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-0.34, -0.88, 0.055, 0.6, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.375, -0.925);
    ctx.lineTo(-0.3, -0.845);
    ctx.moveTo(-0.3, -0.925);
    ctx.lineTo(-0.375, -0.845);
    ctx.stroke();
  }
}
