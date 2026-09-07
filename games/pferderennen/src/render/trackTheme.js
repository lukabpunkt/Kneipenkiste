/**
 * Colours and shared furniture of the race track, used by both orientations.
 *
 * An evening meeting under floodlight. The rule that keeps it readable: everything that covers a
 * large area is dark and sits close in value to its neighbours, and the few bright things — the
 * rail, the lane lines, the lamps, the finish banner — are what the eye lands on. The horses are
 * the brightest objects on the screen, which is the whole point.
 *
 * skyTop and skyBottom are the same values as the --sky-* design tokens, repeated here because
 * canvas cannot read custom properties. Change one, change the other.
 */

export const TRACK_COLOURS = {
  skyTop: '#0F0E1A',
  skyBottom: '#2E2448',
  hillFar: '#2A2145',
  hillNear: '#1D1834',
  standRoof: '#4A3A22',
  standWall: '#2A2340',
  standShade: '#171326',
  fence: '#E6DCC4',
  sand: '#4E4132',
  /** The pool of light down the middle of the track. */
  sandLit: '#5E4C39',
  sandDark: '#382E24',
  line: '#D8CDB4',
  grassLight: '#2C4A2A',
  grassDark: '#1B2F1B',
  ink: '#12101E',
  wood: '#4A3A24',
  banner: '#FFB800',
  /** Not white — the Kneipenkiste paper. Everything bright on the track is this. */
  paper: '#FFF8E7',
  floodPole: '#3A3550',
  floodHead: '#FFE9A8',
  floodPool: 'rgba(255, 184, 0, 0.11)',
};

/**
 * Crowd colours, cycled so the stand looks populated rather than patterned. Same hues as before
 * at a fraction of the brightness: at night a crowd is a texture, and the flashbulbs going off
 * in it are the only thing that should read as light.
 */
export const CROWD = ['#8A3B44', '#8A6A2E', '#2F6B45', '#2A5F73', '#54407E', '#7A3D5C', '#5B5468'];

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

  drawFloodlights(ctx, length, depth, roofY);

  ctx.fillStyle = TRACK_COLOURS.fence;
  ctx.fillRect(0, baseY - 7, length, 4);
  for (let x = 5; x < length; x += 30) ctx.fillRect(x, baseY - 9, 3, 10);
}

/**
 * Masts along the back of the stand. They live in the same cached strip as the stand itself, so
 * both orientations get them for nothing and they scroll on the stand's parallax — which is also
 * physically right, since the lamps are bolted to the stadium rather than standing in the world.
 *
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx
 * @param {number} roofY top of the stand roof; the masts rise above it
 */
function drawFloodlights(ctx, length, depth, roofY) {
  const masts = 4;
  const step = length / masts;
  const poleWidth = Math.max(2, depth * 0.018);
  const headWidth = poleWidth * 5;
  const headHeight = Math.max(3, depth * 0.05);
  const top = roofY - depth * 0.42;

  for (let i = 0; i < masts; i += 1) {
    const x = step * (i + 0.5);

    ctx.fillStyle = TRACK_COLOURS.floodPole;
    ctx.fillRect(x - poleWidth / 2, top, poleWidth, roofY - top);

    ctx.fillStyle = TRACK_COLOURS.floodHead;
    ctx.fillRect(x - headWidth / 2, top, headWidth, headHeight);

    // The bloom around the lamp. A radial gradient rather than a shadow blur: blurs are the one
    // canvas operation that reliably costs a frame, and this is baked once into a cache anyway.
    const glow = ctx.createRadialGradient(
      x,
      top + headHeight / 2,
      0,
      x,
      top + headHeight / 2,
      headWidth * 2.2,
    );
    glow.addColorStop(0, TRACK_COLOURS.floodPool);
    glow.addColorStop(1, 'rgba(255, 184, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - headWidth * 2.2, top - headWidth * 2.2, headWidth * 4.4, headWidth * 4.4);
  }
}
