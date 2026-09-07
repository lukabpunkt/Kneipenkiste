/**
 * The prize giving: three plinths, three horses trotting in, three jockeys climbing up.
 *
 * `docs/04_DESIGN_SYSTEM.md` §4.5 has always asked for this — "3 Sockel in Pferdefarben, Höhe
 * 3/2/1, Pferde springen nacheinander drauf (Stagger 250 ms), Konfetti-Kanone in Siegerfarbe".
 * What shipped in M6 was three CSS cards with head portraits, which is a summary of the result
 * rather than a ceremony.
 *
 * Modelled on attract.js: its own loop, capped well below 60 fps, paused while the tab is hidden,
 * and — unlike the attract mode — it stops itself once the choreography has settled. Nobody
 * should be paying for an animation frame on a screen people sit and read.
 */

import { CEREMONY, RENDER } from '../config.js';
import { drawHorse } from './horse.js';
import { drawStandingJockey } from './jockeyStanding.js';
import { horseColours } from './palette.js';
import { createPose, updatePose } from './horseAnimations.js';
import { createParticles, CONFETTI } from './particles.js';
import { TRACK_COLOURS } from './trackTheme.js';

/** Left to right on screen: second, first, third — the winner in the middle. */
const LAYOUT = [1, 0, 2];

/**
 * Starts the ceremony on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} options
 * @param {object[]} options.horses the top three, in finishing order
 * @param {boolean} [options.calm] reduced motion: everyone is already in place
 * @returns {{stop: () => void}}
 */
export function startCeremony(canvas, { horses, calm = false }) {
  const ctx = canvas.getContext('2d');
  const palettes = horses.map(horseColours);
  const poses = horses.map((_, index) => createPose(index / 3));
  const particles = createParticles(CEREMONY.confettiPool);
  if (calm) particles.setDensity(0);

  let width = 0;
  let height = 0;
  let frame = 0;
  let last = performance.now();
  let clock = calm ? CEREMONY.settledAt : 0;
  let running = true;
  let disposed = false;
  let confettiFired = false;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Setting the size clears the canvas. Once the scene has settled it is no longer drawing, so
    // without this a rotation would leave an empty box where the ceremony was.
    if (disposed || running) return;
    running = true;
    last = performance.now() - CEREMONY.frameMs;
    frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    if (!running) return;
    frame = requestAnimationFrame(draw);
    if (now - last < CEREMONY.frameMs || document.hidden) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (width === 0) resize();
    if (width === 0) return;

    if (!calm) clock += dt;
    ctx.clearRect(0, 0, width, height);

    const stage = layout(width, height);
    drawGround(ctx, stage);

    // Three layers, back to front: the horses stand behind their plinths, the plinths hide the
    // horses' legs, and the jockeys stand on top of everything.
    for (const place of LAYOUT) {
      drawHorseArrival(ctx, {
        stage,
        place,
        horse: horses[place],
        colours: palettes[place],
        pose: poses[place],
        dt: calm ? 0 : dt,
        clock,
      });
    }
    for (const place of LAYOUT) {
      drawPlace(ctx, { stage, place, horse: horses[place] });
    }
    for (const place of LAYOUT) {
      drawJockeyOnPlinth(ctx, {
        stage,
        place,
        horse: horses[place],
        colours: palettes[place],
        clock,
      });
    }

    if (!calm && !confettiFired && clock >= CEREMONY.confettiAt) {
      confettiFired = true;
      for (const side of [0.12, 0.88]) {
        particles.burst(CONFETTI, width * side, height * 0.78, {
          amount: CEREMONY.confettiAmount,
          speed: height * 1.1,
          radius: Math.max(4, height * 0.016),
          seconds: 2.6,
        });
      }
    }
    particles.update(dt);
    particles.draw(ctx);

    // Once everything has arrived there is nothing left to animate. Stop rather than idle.
    if (calm || (clock > CEREMONY.settledAt && particles.count === 0)) {
      running = false;
      cancelAnimationFrame(frame);
    }
  }

  window.addEventListener('resize', resize);
  resize();
  frame = requestAnimationFrame(draw);

  return {
    stop() {
      running = false;
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    },
  };
}

/**
 * Where everything goes, for a given canvas size.
 * @param {number} width
 * @param {number} height
 * @returns {object}
 */
function layout(width, height) {
  const ground = height * CEREMONY.ground;
  const slot = width / 3;
  const plinthWidth = slot * CEREMONY.plinthWidth;
  const unit = height * CEREMONY.plinthStep;
  return {
    width,
    height,
    ground,
    slot,
    plinthWidth,
    // Heights 3 / 2 / 1, as the design document asks.
    plinthHeight: [unit * 3, unit * 2, unit],
    horseSize: height * CEREMONY.horseSize,
  };
}

/**
 * The strip of turf everything stands on.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} stage
 */
function drawGround(ctx, stage) {
  const grass = ctx.createLinearGradient(0, stage.ground, 0, stage.height);
  grass.addColorStop(0, TRACK_COLOURS.grassDark);
  grass.addColorStop(1, TRACK_COLOURS.grassLight);
  ctx.fillStyle = grass;
  ctx.fillRect(0, stage.ground, stage.width, stage.height - stage.ground);
}

/**
 * Screen x of the middle of one place's slot.
 * @param {object} stage
 * @param {number} place 0 for the winner
 * @returns {number}
 */
function slotCentre(stage, place) {
  return stage.slot * (LAYOUT.indexOf(place) + 0.5);
}

/**
 * The plinth itself, with its number.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 */
function drawPlace(ctx, { stage, place, horse }) {
  const centre = slotCentre(stage, place);
  const top = stage.ground - stage.plinthHeight[place];
  const half = stage.plinthWidth / 2;

  ctx.fillStyle = horse.colorDark;
  ctx.beginPath();
  ctx.roundRect(centre - half, top, stage.plinthWidth, stage.ground - top, 6);
  ctx.fill();
  ctx.fillStyle = horse.color;
  ctx.beginPath();
  ctx.roundRect(centre - half, top, stage.plinthWidth, stage.plinthHeight[place] * 0.16 + 8, 6);
  ctx.fill();

  ctx.fillStyle = TRACK_COLOURS.white;
  ctx.font = `700 ${Math.max(14, stage.plinthWidth * 0.34)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(place + 1), centre, top + stage.plinthHeight[place] * 0.55);
}

/**
 * How far along its entrance one place is: 0 before it starts, 1 once the horse has stopped.
 *
 * Exported for the tests: the order the three arrive in is the whole choreography, and it is
 * worth being able to check it without a canvas.
 *
 * @param {number} clock seconds since the scene appeared
 * @param {number} place 0 for the winner
 * @returns {number}
 */
export function walkProgress(clock, place) {
  // Third place arrives first, then second, then the winner.
  const delay = (2 - place) * CEREMONY.stagger;
  return Math.max(0, Math.min(1, (clock - delay) / CEREMONY.walkSeconds));
}

/**
 * How far the jockey has got onto the plinth, 0 to 1.
 * @param {number} clock seconds since the scene appeared
 * @param {number} place 0 for the winner
 * @returns {number}
 */
export function climbProgress(clock, place) {
  const delay = (2 - place) * CEREMONY.stagger + CEREMONY.walkSeconds;
  return Math.max(0, Math.min(1, (clock - delay) / CEREMONY.climbSeconds));
}

/** Smoothstep. */
const ease = (t) => t * t * (3 - 2 * t);

/**
 * Where a horse comes to a stop: behind its plinth and a little to the outside.
 * @param {object} stage
 * @param {number} place
 * @returns {number}
 */
function parkedAt(stage, place) {
  const centre = slotCentre(stage, place);
  const outward = centre < stage.width / 2 ? -1 : 1;
  const wanted = centre + outward * stage.plinthWidth * 0.62;
  // Kept inside the frame: on a narrow canvas the outer two would otherwise hang off the edge.
  // A horse reaches further forward than back, so the margin is generous.
  const margin = stage.horseSize * 0.95;
  return Math.max(margin, Math.min(stage.width - margin, wanted));
}

/**
 * The horse trotting in and standing behind its plinth.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 */
function drawHorseArrival(ctx, { stage, place, horse, colours, pose, dt, clock }) {
  const t = walkProgress(clock, place);
  const parked = parkedAt(stage, place);
  const from = parked < stage.width / 2 ? -stage.horseSize : stage.width + stage.horseSize;
  const x = from + (parked - from) * ease(t);

  // Once the jockey is off, the horse carries on without him — the same flag the race uses.
  pose.riderless = climbProgress(clock, place) > 0;
  updatePose(pose, dt, {
    anim: t >= 1 ? (place === 0 ? 'celebrate' : 'idle') : 'trot_in',
    speed: t >= 1 ? 0 : 1,
  });
  // Standing back from the plinth, which in this flat view means standing a little higher.
  drawHorse(ctx, {
    horse,
    colours,
    pose,
    x,
    y: stage.ground - stage.height * CEREMONY.horseSetBack,
    size: stage.horseSize,
  });
}

/**
 * The jockey climbing onto his plinth and staying there.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 */
function drawJockeyOnPlinth(ctx, { stage, place, horse, colours, clock }) {
  const climb = climbProgress(clock, place);
  if (climb <= 0) return;
  const smooth = ease(climb);
  const centre = slotCentre(stage, place);
  const top = stage.ground - stage.plinthHeight[place];
  const parked = parkedAt(stage, place);

  drawStandingJockey(ctx, {
    horse,
    colours,
    x: parked + (centre - parked) * smooth,
    y: stage.ground + (top - stage.ground) * smooth,
    size: stage.horseSize,
    // The winner throws both arms up; the other two wave rather than celebrate.
    cheer: (place === 0 ? 1 : 0.28) * smooth,
    bob: place === 0 ? Math.abs(Math.sin(clock * 3)) * 0.02 * smooth : 0,
  });
}
