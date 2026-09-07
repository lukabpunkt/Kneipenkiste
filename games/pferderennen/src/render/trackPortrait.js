/**
 * The race track in portrait: six vertical lanes running bottom to top, grandstands down both
 * sides, the starting gates at the bottom and the finish line at the top.
 *
 * This is the layout a phone gets, and the phone is the most common way this game is played —
 * so portrait is not a fallback, it is the other half of the design (docs/02_ARCHITECTURE.md §7).
 *
 * The horses are drawn from behind here, which puts the saddle and the silks straight at the
 * viewer: the largest possible patch of the signature colour, so you can find your horse on a
 * small screen at a glance.
 */

import { TRACK_LENGTH, RUNNER_COUNT, STARTER } from '../config.js';
import { TRACK_COLOURS as COLOURS, MARKER_SPACING, drawGrandstandStrip } from './trackTheme.js';
import { createCrowdFlashes } from './crowdFlashes.js';

/** Share of the width taken by the grandstand down each side. */
const SIDE_WIDTH = 0.085;

/** Parallax of the stands relative to the track, and of the rail in the very front. */
const STAND_PARALLAX = 0.55;

/** A lane is this many times as wide as a horse is long. */
const HORSE_TO_LANE = 0.82;

/**
 * Creates the portrait track renderer.
 * @param {object} options
 * @param {object} options.camera
 * @param {object[]} options.horses entries from data/horses.js, in runner order
 * @returns {object}
 */
export function createPortraitTrack({ camera, horses }) {
  let width = 0;
  let height = 0;
  let stand = null;
  /** How excited the crowd is right now; decays back to zero. */
  let cheer = 0;
  let energy = 0;
  const flashes = createCrowdFlashes();

  /** Left edge of the racing surface, and how wide it is. */
  function trackLeft() {
    return width * SIDE_WIDTH;
  }

  function trackWidth() {
    return width * (1 - 2 * SIDE_WIDTH);
  }

  /** Centre of lane `index` in screen pixels. Lane 0 is on the left. */
  function laneCentre(index) {
    return trackLeft() + (trackWidth() / RUNNER_COUNT) * (index + 0.5);
  }

  /** Builds the cached grandstand strip, drawn along its own axis and rotated when used. */
  function buildCaches() {
    const depth = Math.max(40, Math.ceil(width * SIDE_WIDTH));
    const tile = Math.max(320, Math.ceil(height * 0.9));
    stand = new OffscreenCanvas(tile, depth);
    drawGrandstandStrip(stand.getContext('2d'), tile, depth);
  }

  /**
   * Draws the cached stand down one side. The strip is built horizontally and rotated into
   * place, so both sides come from the same cache.
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} mirrored true for the right-hand stand
   */
  function drawStand(ctx, mirrored) {
    if (!stand) return;
    const depth = stand.height;
    const shift = -(camera.centre * camera.pixelsPerUnit * STAND_PARALLAX) % stand.width;

    ctx.save();
    if (mirrored) {
      ctx.translate(width, height);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, height);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1, -1);
      ctx.translate(0, -depth);
    }
    // The whole stand hops when something happens; in portrait that is sideways on screen.
    const lift = -Math.abs(Math.sin(cheer * 9)) * cheer * 6;
    for (let x = shift - stand.width; x < height + stand.width; x += stand.width) {
      ctx.drawImage(stand, Math.round(x), Math.round(lift));
    }
    // Inside the rotated frame, so the band follows whichever side this stand is on.
    flashes.draw(ctx, { x: 0, y: lift + depth * 0.66, width: height, height: depth * 0.3 });
    ctx.restore();
  }

  const track = {
    /** Which horse drawing this orientation needs. */
    view: 'rear',

    /** The crowd reacts to an event. Decays on its own. */
    cheer() {
      cheer = 1;
    },

    /**
     * How worked up the stand is, 0 at the start of a race and 1 at the line.
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

    resize(pixelWidth, pixelHeight) {
      width = pixelWidth;
      height = pixelHeight;
      camera.setViewport(height);
      buildCaches();
    },

    /** How wide one lane is. */
    laneHeight() {
      return trackWidth() / RUNNER_COUNT;
    },

    /** How big a horse is drawn. Every lane is the same width, so every horse is the same size. */
    horseSize() {
      return track.laneHeight() * HORSE_TO_LANE;
    },

    /**
     * Where a horse's hooves sit on screen. The race runs upwards, so a larger track position
     * means a smaller screen y.
     * @param {number} units
     * @param {number} lane
     * @returns {{x: number, y: number}}
     */
    positionOf(units, lane) {
      return {
        x: laneCentre(lane) + camera.shakeCross,
        y: height - camera.toAlong(units),
      };
    },

    /**
     * Sorting key for the draw order; smaller is further away and drawn first. Here the lanes
     * are side by side at the same distance, so what decides the overlap is how far up the
     * track a horse is: the leader is furthest away and goes down first.
     * @param {number} units position along the track
     * @returns {number}
     */
    depthKey(units) {
      return -units;
    },

    /** Sky above the finish, and the two stands down the sides. */
    drawBackdrop(ctx) {
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, COLOURS.skyTop);
      sky.addColorStop(1, COLOURS.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      drawStand(ctx, false);
      drawStand(ctx, true);
    },

    /** The six lanes with their dividing lines, plus the distance markers. */
    drawTrack(ctx) {
      const left = trackLeft();
      const surface = trackWidth();

      const sand = ctx.createLinearGradient(left, 0, left + surface, 0);
      sand.addColorStop(0, COLOURS.sandDark);
      sand.addColorStop(0.25, COLOURS.sand);
      sand.addColorStop(0.75, COLOURS.sand);
      sand.addColorStop(1, COLOURS.sandDark);
      ctx.fillStyle = sand;
      ctx.fillRect(left, 0, surface, height);

      ctx.strokeStyle = COLOURS.line;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(1, surface * 0.004);
      for (let i = 1; i < RUNNER_COUNT; i += 1) {
        const x = left + (surface / RUNNER_COUNT) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Distance markers as bands across the track, which reads better than signs on a phone.
      ctx.font = `${Math.max(9, width * 0.028)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let unit = MARKER_SPACING; unit < TRACK_LENGTH; unit += MARKER_SPACING) {
        const y = height - camera.toAlong(unit);
        if (y < -20 || y > height + 20) continue;
        ctx.strokeStyle = COLOURS.line;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + surface, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLOURS.ink;
        ctx.globalAlpha = 0.45;
        ctx.fillText(String(unit), left + 4, y - 8);
        ctx.globalAlpha = 1;
      }
    },

    /**
     * The starting gates at the bottom, one per lane in the colour of the horse that drew it.
     * @param {number} open 0 closed, 1 fully swung open
     * @param {number[]} laneOfRunner
     */
    drawGates(ctx, open, laneOfRunner) {
      const y = height - camera.toAlong(0);
      if (y < -160 || y > height + 160) return;

      const lane = track.laneHeight();
      for (let runner = 0; runner < RUNNER_COUNT; runner += 1) {
        const centre = laneCentre(laneOfRunner[runner]);
        const horse = horses[runner];

        ctx.fillStyle = COLOURS.wood;
        ctx.fillRect(centre - lane * 0.5, y + 20, 4, 5);
        ctx.fillRect(centre + lane * 0.5 - 4, y + 20, 4, 5);

        // The gate swings downwards out of the way.
        ctx.save();
        ctx.translate(centre, y + 22);
        ctx.rotate(open * 1.2);
        ctx.fillStyle = horse.color;
        ctx.strokeStyle = horse.colorDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-lane * 0.42, 0, lane * 0.84, 34, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLOURS.white;
        ctx.font = `${Math.max(12, lane * 0.4)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(horse.number), 0, 17);
        ctx.restore();
      }
    },

    /** The chequered line on the ground, drawn before the horses run over it. */
    /**
     * Where the starter stands: in the grass margin beside the start line.
     * @returns {{x: number, y: number, size: number}}
     */
    starterAnchor() {
      return {
        x: trackLeft() * 0.55,
        y: height - camera.toAlong(0) + track.laneHeight() * 0.5,
        size: track.horseSize() * STARTER.scale,
      };
    },

    drawFinish(ctx) {
      const y = height - camera.toAlong(TRACK_LENGTH);
      if (y < -40 || y > height + 60) return;

      const left = trackLeft();
      const surface = trackWidth();
      const squares = 12;
      const size = surface / squares;
      for (let i = 0; i < squares; i += 1) {
        for (let row = 0; row < 2; row += 1) {
          ctx.fillStyle = (i + row) % 2 === 0 ? COLOURS.ink : COLOURS.white;
          ctx.fillRect(left + i * size, y - 11 + row * 11, size, 11);
        }
      }
    },

    /**
     * The banner on its posts, drawn *after* the horses: it hangs above the track and they run
     * underneath it. Drawn before them it would simply disappear behind the field at the finish.
     */
    drawOverhead(ctx) {
      const y = height - camera.toAlong(TRACK_LENGTH);
      if (y < -200 || y > height + 200) return;

      const left = trackLeft();
      const surface = trackWidth();
      const bannerHeight = Math.max(26, height * 0.045);
      const bannerY = y - bannerHeight - 14;

      ctx.fillStyle = COLOURS.wood;
      ctx.fillRect(left - 7, bannerY, 7, bannerHeight + 20);
      ctx.fillRect(left + surface, bannerY, 7, bannerHeight + 20);
      ctx.fillStyle = COLOURS.banner;
      ctx.beginPath();
      ctx.roundRect(left - 9, bannerY, surface + 18, bannerHeight, 6);
      ctx.fill();
      ctx.fillStyle = COLOURS.white;
      ctx.font = `700 ${Math.max(13, bannerHeight * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ZIEL', left + surface / 2, bannerY + bannerHeight / 2);
    },

    /** Nothing sits in front of the horses in portrait; the stands already frame the track. */
    drawForeground() {},
  };

  return track;
}
