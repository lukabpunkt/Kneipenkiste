/**
 * The handful of drawing primitives the horse and its tack share.
 *
 * Capsules — thick lines with round caps — are what give the cartoon look with very few path
 * operations, which matters because six horses are drawn sixty times a second.
 */

/** Outline width, in units of the horse's body length. */
export const OUTLINE = 0.035;

/**
 * A capsule: a thick line with round ends.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} width
 * @param {string} colour
 */
export function capsule(ctx, x1, y1, x2, y2, width, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Blends two hex colours.
 * @param {string} a
 * @param {string} b
 * @param {number} t 0 returns a, 1 returns b
 * @returns {string}
 */
export function mix(a, b, t) {
  const parse = (hex) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const channel = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${channel(r1, r2)} ${channel(g1, g2)} ${channel(b1, b2)})`;
}
