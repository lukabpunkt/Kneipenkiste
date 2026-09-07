/**
 * The race track in landscape: sky, hills, grandstand, fence, six sand lanes running left to
 * right, the grass in front, distance markers, the finish line and the starting gates in the
 * horses' own colours.
 *
 * The back layers never change, so they are painted once into offscreen canvases and afterwards
 * only blitted with a parallax offset — that keeps the per-frame path count inside the budget
 * from docs/02_ARCHITECTURE.md §8.
 *
 * The lanes are laid out with a little perspective: the back lane is thinner than the front one,
 * and horses are sized to match, which is what stops six parallel stripes looking like a chart.
 */

import { TRACK_LENGTH, RUNNER_COUNT, STARTER } from '../config.js';
import { TRACK_COLOURS as COLOURS, MARKER_SPACING, drawGrandstandStrip } from './trackTheme.js';
import { createCrowdFlashes } from './crowdFlashes.js';

/** Vertical layout, as shares of the canvas height. */
const TRACK_TOP = 0.44;
const TRACK_BOTTOM = 0.9;

/** How strongly the lanes fan out towards the viewer. 1 would be flat. */
const PERSPECTIVE = 1.3;

/** Parallax factors of the layers behind and in front of the track. */
const HILL_PARALLAX = 0.15;
const STAND_PARALLAX = 0.45;
const GRASS_PARALLAX = 1.25;

/**
 * Creates the track renderer.
 * @param {object} options
 * @param {object} options.camera
 * @param {object[]} options.horses entries from data/horses.js, in runner order
 * @returns {object}
 */
export function createLandscapeTrack({ camera, horses }) {
  let width = 0;
  let height = 0;
  let hills = null;
  let stand = null;
  /** How excited the crowd is right now; decays back to zero. */
  let cheer = 0;
  let energy = 0;
  const flashes = createCrowdFlashes();

  /** Top edge of lane i, in pixels. Lane 0 is at the back. */
  function laneEdge(index) {
    const top = height * TRACK_TOP;
    const span = height * (TRACK_BOTTOM - TRACK_TOP);
    return top + span * (index / RUNNER_COUNT) ** PERSPECTIVE;
  }

  /** Builds the two cached backdrop strips. Called on resize only. */
  function buildCaches() {
    const bandHeight = Math.ceil(height * TRACK_TOP) + 2;
    const tile = Math.max(360, Math.ceil(width * 0.8));

    hills = new OffscreenCanvas(tile, bandHeight);
    const hillCtx = hills.getContext('2d');
    hillCtx.fillStyle = COLOURS.hillFar;
    for (let i = -1; i < 6; i += 1) {
      const cx = (i * tile) / 5 + tile / 10;
      hillCtx.beginPath();
      hillCtx.ellipse(cx, bandHeight * 0.73, tile / 4.5, height * 0.1, 0, Math.PI, 0);
      hillCtx.fill();
    }
    hillCtx.fillStyle = COLOURS.hillNear;
    for (let i = -1; i < 8; i += 1) {
      const cx = (i * tile) / 7 + tile / 14;
      hillCtx.beginPath();
      hillCtx.ellipse(cx, bandHeight * 0.75, tile / 6, height * 0.06, 0, Math.PI, 0);
      hillCtx.fill();
    }

    stand = new OffscreenCanvas(tile, bandHeight);
    const standCtx = stand.getContext('2d');
    // The stand sits at the bottom of the band, so the hills stay visible above its roof.
    const standDepth = bandHeight * 0.4;
    standCtx.translate(0, bandHeight - standDepth);
    drawGrandstandStrip(standCtx, tile, standDepth);
  }

  /**
   * Blits a cached strip across the view with a parallax offset.
   * @param {number} lift vertical offset, used for the crowd jumping up at an event
   */
  function blit(ctx, canvas, parallax, lift = 0) {
    if (!canvas) return;
    const shift = -(camera.centre * camera.pixelsPerUnit * parallax) % canvas.width;
    for (let x = shift - canvas.width; x < width + canvas.width; x += canvas.width) {
      ctx.drawImage(canvas, Math.round(x), Math.round(lift));
    }
  }

  const track = {
    /** Which horse drawing this orientation needs. */
    view: 'side',

    /** The crowd reacts to an event. Decays on its own. */
    cheer() {
      cheer = 1;
    },

    /**
     * How worked up the stand is, 0 at the start of a race and 1 at the line. Drives the
     * flashbulbs.
     * @param {number} value
     */
    setCrowdEnergy(value) {
      energy = Math.max(0, Math.min(1, value));
    },

    /** Advances anything the track animates by itself. */
    tick(dt) {
      if (cheer > 0) cheer = Math.max(0, cheer - dt * 0.9);
      flashes.update(dt, energy);
    },

    /** Rebuilds everything that depends on the canvas size. */
    resize(pixelWidth, pixelHeight) {
      width = pixelWidth;
      height = pixelHeight;
      camera.setViewport(width);
      buildCaches();
    },

    /** Screen y of the centre of a lane. */
    laneY(index) {
      return (laneEdge(index) + laneEdge(index + 1)) / 2;
    },

    /** How tall a lane is, which also sets how big the horses in it are drawn. */
    laneHeight(index) {
      return laneEdge(index + 1) - laneEdge(index);
    },

    /** Body length in pixels for a horse in this lane. */
    horseSize(index) {
      return track.laneHeight(index) * 1.55;
    },

    /**
     * Where a horse's hooves sit on screen.
     * @param {number} units position along the track
     * @param {number} lane
     * @returns {{x: number, y: number}}
     */
    positionOf(units, lane) {
      return { x: camera.toAlong(units), y: track.laneY(lane) + camera.shakeCross };
    },

    /**
     * Sorting key for the draw order; smaller is further away and drawn first. In landscape the
     * back lane is the far one, so the lane index is the key.
     * @param {number} units unused here
     * @param {number} lane
     * @returns {number}
     */
    depthKey(units, lane) {
      return lane;
    },

    /** Lanes and the markers along them. */
    drawTrack(ctx) {
      track.drawLanes(ctx);
      track.drawMarkers(ctx);
    },

    /** Sky, hills and the grandstand. */
    drawBackdrop(ctx) {
      const sky = ctx.createLinearGradient(0, 0, 0, height * TRACK_TOP);
      sky.addColorStop(0, COLOURS.skyTop);
      sky.addColorStop(1, COLOURS.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height * TRACK_TOP + 1);

      blit(ctx, hills, HILL_PARALLAX);
      // The whole stand hops when something happens. Animating individual spectators would mean
      // giving up the cache, and this reads the same from where the viewer sits.
      const hop = -Math.abs(Math.sin(cheer * 9)) * cheer * 7;
      blit(ctx, stand, STAND_PARALLAX, hop);
      // On top of the blit, because the stand is a cached strip and these change every frame.
      // The stand cache is a band whose lower 40 % is the tiers; the flashes belong in there.
      const bandTop = height * TRACK_TOP - stand.height;
      flashes.draw(ctx, {
        x: 0,
        y: bandTop + stand.height * 0.66 + hop,
        width,
        height: stand.height * 0.3,
      });
    },

    /** The six sand lanes with their dividing lines. */
    drawLanes(ctx) {
      const top = laneEdge(0);
      const bottom = laneEdge(RUNNER_COUNT);

      const sand = ctx.createLinearGradient(0, top, 0, bottom);
      sand.addColorStop(0, COLOURS.sandDark);
      sand.addColorStop(0.35, COLOURS.sand);
      sand.addColorStop(1, COLOURS.sand);
      ctx.fillStyle = sand;
      ctx.fillRect(0, top, width, bottom - top);

      ctx.strokeStyle = COLOURS.line;
      ctx.globalAlpha = 0.55;
      for (let i = 1; i < RUNNER_COUNT; i += 1) {
        const y = laneEdge(i);
        ctx.lineWidth = Math.max(1, track.laneHeight(i) * 0.045);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },

    /** Distance markers along the far rail, so the pace is readable. */
    drawMarkers(ctx) {
      const y = laneEdge(0);
      ctx.font = `${Math.max(9, height * 0.016)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      for (let unit = MARKER_SPACING; unit < TRACK_LENGTH; unit += MARKER_SPACING) {
        const x = camera.toAlong(unit);
        if (x < -40 || x > width + 40) continue;
        const postHeight = height * 0.035;
        ctx.fillStyle = COLOURS.wood;
        ctx.fillRect(x - 1, y - postHeight, 2, postHeight);
        ctx.fillStyle = COLOURS.fence;
        ctx.beginPath();
        ctx.roundRect(x - 11, y - postHeight - 12, 22, 13, 3);
        ctx.fill();
        ctx.fillStyle = COLOURS.ink;
        ctx.fillText(String(unit), x, y - postHeight - 1);
      }
    },

    /**
     * The starting gates, one per lane in the colour of the horse that drew it.
     * @param {number} open 0 closed, 1 fully swung open
     * @param {number[]} laneOfRunner laneOfRunner[runner] = lane index
     */
    drawGates(ctx, open, laneOfRunner) {
      const x = camera.toAlong(0);
      if (x < -260 || x > width + 120) return;

      for (let runner = 0; runner < RUNNER_COUNT; runner += 1) {
        const lane = laneOfRunner[runner];
        const top = laneEdge(lane);
        const laneHeight = track.laneHeight(lane);
        const horse = horses[runner];

        // Frame.
        ctx.fillStyle = COLOURS.wood;
        ctx.fillRect(x - 26, top, 5, laneHeight);
        ctx.fillRect(x + 22, top, 5, laneHeight);

        // The door swings away from the track as it opens.
        ctx.save();
        ctx.translate(x - 21, top + laneHeight * 0.5);
        ctx.rotate(-open * 1.15);
        ctx.fillStyle = horse.color;
        ctx.strokeStyle = horse.colorDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(0, -laneHeight * 0.42, 44, laneHeight * 0.84, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${Math.max(11, laneHeight * 0.42)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(horse.number), 22, 0);
        ctx.restore();
      }
    },

    /** The chequered bar across the lanes, on the ground. */
    /**
     * Where the starter stands: at the near rail, behind the start line, so the camera carries him
     * out of shot as soon as the field sets off.
     *
     * The near side rather than the far side on purpose — in front of the grandstand a dark
     * figure disappears into the crowd, and against the sand it reads immediately.
     * @returns {{x: number, y: number, size: number}}
     */
    starterAnchor() {
      const near = track.laneHeight(RUNNER_COUNT - 1);
      return {
        x: camera.toAlong(0) - near * 1.5,
        y: laneEdge(RUNNER_COUNT),
        size: track.horseSize(RUNNER_COUNT - 1) * STARTER.scale,
      };
    },

    drawFinish(ctx) {
      const x = camera.toAlong(TRACK_LENGTH);
      if (x < -80 || x > width + 200) return;

      const top = laneEdge(0);
      const bottom = laneEdge(RUNNER_COUNT);
      // Two columns of squares, wide enough to stay readable behind a bunched-up field.
      const squares = 16;
      const size = (bottom - top) / squares;
      for (let i = 0; i < squares; i += 1) {
        for (let column = 0; column < 2; column += 1) {
          ctx.fillStyle = (i + column) % 2 === 0 ? COLOURS.ink : COLOURS.white;
          ctx.fillRect(x - 11 + column * 11, top + i * size, 11, size);
        }
      }
    },

    /** The banner on its posts, above the track and therefore over the horses. */
    drawOverhead(ctx) {
      const x = camera.toAlong(TRACK_LENGTH);
      if (x < -160 || x > width + 260) return;

      const top = laneEdge(0);
      const bannerY = top - height * 0.13;
      ctx.fillStyle = COLOURS.wood;
      ctx.fillRect(x - 62, bannerY, 6, top - bannerY);
      ctx.fillRect(x + 56, bannerY, 6, top - bannerY);
      ctx.fillStyle = COLOURS.banner;
      ctx.beginPath();
      ctx.roundRect(x - 66, bannerY - 6, 132, height * 0.055, 6);
      ctx.fill();
      ctx.fillStyle = COLOURS.white;
      ctx.font = `700 ${Math.max(12, height * 0.032)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ZIEL', x, bannerY - 6 + height * 0.0275);
    },

    /** The grass strip closest to the viewer, which slides past fastest. */
    drawForeground(ctx) {
      const top = laneEdge(RUNNER_COUNT);
      const grass = ctx.createLinearGradient(0, top, 0, height);
      grass.addColorStop(0, COLOURS.grassDark);
      grass.addColorStop(1, COLOURS.grassLight);
      ctx.fillStyle = grass;
      ctx.fillRect(0, top, width, height - top);

      // Tufts, spaced in world units so they slide past with the track.
      const shift = -(camera.centre * camera.pixelsPerUnit * GRASS_PARALLAX) % 46;
      ctx.strokeStyle = COLOURS.grassDark;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let x = shift - 46; x < width + 46; x += 46) {
        const base = top + (height - top) * 0.45;
        ctx.beginPath();
        ctx.moveTo(x, base + 10);
        ctx.lineTo(x + 4, base);
        ctx.moveTo(x + 7, base + 10);
        ctx.lineTo(x + 6, base - 2);
        ctx.stroke();
      }
    },
  };

  return track;
}
