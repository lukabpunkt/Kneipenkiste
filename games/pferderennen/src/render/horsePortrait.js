/**
 * A horse's head, drawn small.
 *
 * Used wherever a horse has to be recognisable outside the race: the betting cards and the
 * podium. It is deliberately its own module — a portrait needs the palette and a few shapes, not
 * the track, the particles or the gallop cycle, so a betting screen stays cheap to load.
 *
 * The head faces the viewer at three-quarters, which shows both the coat and the accessory, and
 * the signature colour comes back in as a halo behind it.
 */

import { capsule, OUTLINE } from './shapes.js';
import { horseColours } from './palette.js';

/** How large the drawing is in its own units; the canvas scales to whatever size is asked for. */
const UNIT = 1;

/**
 * Draws one portrait into a context, filling the box from (0,0) to (size, size).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} horse
 * @param {number} size
 */
export function drawPortrait(ctx, horse, size) {
  const colours = horseColours(horse);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(size * 0.5, size * 0.5);

  // Halo in the signature colour, so the card reads from across the table.
  ctx.fillStyle = horse.color;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(0, 0, UNIT * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Neck coming up from the bottom-left of the frame.
  capsule(ctx, -0.42, 0.95, -0.22, 0.24, 0.5 + OUTLINE, colours.coatDark);
  capsule(ctx, -0.42, 0.95, -0.22, 0.24, 0.5, colours.coat);

  // Skull and muzzle, near enough horizontal so the nose does not run out of the circle.
  ctx.save();
  ctx.translate(-0.16, -0.04);
  ctx.rotate(0.12);
  ctx.scale(0.88, 0.88);
  capsule(ctx, -0.16, -0.16, 0.42, 0.12, 0.5 + OUTLINE, colours.coatDark);
  capsule(ctx, -0.16, -0.16, 0.42, 0.12, 0.5, colours.coat);
  capsule(ctx, 0.24, 0.06, 0.46, 0.13, 0.38, colours.coatLight);

  // Ears.
  ctx.fillStyle = colours.coat;
  ctx.strokeStyle = colours.coatDark;
  ctx.lineWidth = OUTLINE * 1.6;
  for (const [x, tilt] of [
    [-0.28, -0.35],
    [-0.06, 0.05],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, -0.38);
    ctx.quadraticCurveTo(x - 0.04 + tilt * 0.2, -0.72, x + 0.16, -0.34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Eye.
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(0.06, -0.1, 0.13, 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colours.ink;
  ctx.beginPath();
  ctx.ellipse(0.1, -0.09, 0.075, 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0.13, -0.13, 0.032, 0, Math.PI * 2);
  ctx.fill();

  // Nostril.
  ctx.fillStyle = colours.coatDark;
  ctx.beginPath();
  ctx.ellipse(0.46, 0.11, 0.05, 0.038, 0.3, 0, Math.PI * 2);
  ctx.fill();

  drawPortraitAccessory(ctx, horse, colours);
  ctx.restore();

  // Mane along the crest, behind the ears and down the neck.
  ctx.strokeStyle = colours.mane;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.17;
  ctx.beginPath();
  ctx.moveTo(-0.36, -0.44);
  ctx.quadraticCurveTo(-0.62, -0.1, -0.6, 0.5);
  ctx.stroke();

  ctx.restore();
}

/** The accessory, in the head's own frame. */
function drawPortraitAccessory(ctx, horse, colours) {
  switch (horse.accessory) {
    case 'sunglasses':
      ctx.fillStyle = colours.ink;
      ctx.strokeStyle = horse.colorDark;
      ctx.lineWidth = OUTLINE * 1.4;
      ctx.beginPath();
      ctx.roundRect(-0.06, -0.24, 0.36, 0.24, 0.09);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(0.0, -0.04);
      ctx.lineTo(0.1, -0.18);
      ctx.stroke();
      break;
    case 'knightHelmet':
      ctx.fillStyle = '#C9CDD6';
      ctx.strokeStyle = '#8A8F9B';
      ctx.lineWidth = OUTLINE * 1.6;
      ctx.beginPath();
      ctx.arc(-0.06, -0.34, 0.36, Math.PI * 1.05, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'ushanka':
      ctx.fillStyle = '#7A6B82';
      ctx.strokeStyle = '#5A4D61';
      ctx.lineWidth = OUTLINE * 1.6;
      ctx.beginPath();
      ctx.arc(-0.08, -0.36, 0.38, Math.PI * 1.02, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'clover':
      ctx.fillStyle = '#22C55E';
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = OUTLINE;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(-0.34, -0.3, 0.13, 0.08, (i * Math.PI) / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'coffeeMug':
      ctx.fillStyle = '#FFF8EE';
      ctx.strokeStyle = '#6B5B73';
      ctx.lineWidth = OUTLINE * 1.4;
      ctx.beginPath();
      ctx.roundRect(0.3, -0.5, 0.26, 0.3, 0.06);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4A2717';
      ctx.beginPath();
      ctx.ellipse(0.43, -0.46, 0.1, 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'pretzel':
      ctx.strokeStyle = '#B4762F';
      ctx.lineWidth = 0.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0.36, -0.42, 0.15, 0.6, Math.PI * 1.9);
      ctx.stroke();
      break;
    default:
      break;
  }
}

/**
 * Builds a canvas with one portrait on it, ready to drop into the DOM.
 * @param {object} horse
 * @param {number} size in CSS pixels
 * @param {number} [ratio] device pixel ratio, capped by the caller
 * @returns {HTMLCanvasElement}
 */
export function createPortrait(horse, size, ratio = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.setAttribute('aria-hidden', 'true');

  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  drawPortrait(ctx, horse, size);
  return canvas;
}
