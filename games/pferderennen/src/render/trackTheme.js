/**
 * Colours and shared furniture of the race track, used by both orientations.
 *
 * These are the same values as the CSS design tokens, repeated here because canvas cannot read
 * custom properties. Whenever a token in tokens.css changes, this file changes with it.
 */

export const TRACK_COLOURS = {
  skyTop: '#FFB88C',
  skyBottom: '#C9A7EB',
  hillFar: '#B79AD6',
  hillNear: '#8FBF6B',
  standRoof: '#8B5A2B',
  standWall: '#C98F5A',
  standShade: '#A6713F',
  fence: '#FFF7E6',
  sand: '#E8C88A',
  sandDark: '#D9B370',
  line: '#FFF7E6',
  grassLight: '#7ED957',
  grassDark: '#4CAF50',
  ink: '#2B1D2E',
  wood: '#8B5A2B',
  banner: '#FF6B35',
  white: '#FFFFFF',
};

/** Crowd colours, cycled so the stand looks populated rather than patterned. */
export const CROWD = ['#EF4444', '#F59E0B', '#22C55E', '#06B6D4', '#8B5CF6', '#EC4899', '#FFF8EE'];

/** A distance marker every this many track units. */
export const MARKER_SPACING = 100;

/**
 * Draws a strip of grandstand: roof, wall, tiers of spectators and the rail in front.
 *
 * Both orientations use this; portrait rotates the context first so the stand runs down the
 * side of the screen instead of across the top.
 *
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
 * @param {number} length how far the stand runs
 * @param {number} depth how deep it is, from the roof to the rail
 */
export function drawGrandstandStrip(ctx, length, depth) {
  const baseY = depth - 1;
  const standTop = depth * 0.32;
  const roofY = standTop - depth * 0.1;

  ctx.fillStyle = TRACK_COLOURS.standWall;
  ctx.fillRect(0, standTop, length, baseY - standTop);

  const rows = 3;
  const rowHeight = (baseY - standTop - 4) / rows;
  const dot = Math.max(1.5, rowHeight * 0.24);
  ctx.globalAlpha = 0.85;
  for (let row = 0; row < rows; row += 1) {
    const y = standTop + 4 + row * rowHeight;
    const step = dot * 2.9;
    for (let x = (row % 2) * step * 0.5; x < length; x += step) {
      ctx.fillStyle = CROWD[(row * 5 + Math.round(x / step)) % CROWD.length];
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }
    // A step of shade under each row, which is what makes it read as tiers.
    ctx.fillStyle = TRACK_COLOURS.standShade;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, y + dot, length, Math.max(1, rowHeight * 0.22));
    ctx.globalAlpha = 0.85;
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = TRACK_COLOURS.standRoof;
  ctx.fillRect(0, roofY, length, Math.max(5, depth * 0.04));
  ctx.globalAlpha = 0.55;
  for (let x = 0; x < length; x += length / 8) {
    ctx.fillRect(x, roofY, 4, standTop - roofY + 6);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = TRACK_COLOURS.fence;
  ctx.fillRect(0, baseY - 7, length, 4);
  for (let x = 5; x < length; x += 30) ctx.fillRect(x, baseY - 9, 3, 10);
}
