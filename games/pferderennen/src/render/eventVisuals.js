/**
 * The props that make an event readable.
 *
 * Every event has to be understandable without the commentary line (audit A3), so each one gets
 * something you can point at: a banana that flies in and lands, a pigeon that arrives, a fan at
 * the rail holding up a phone. Props with a `lead` start early enough that they arrive on the
 * exact frame the effect begins — the banana landing *is* the moment the horse starts to slide.
 *
 * Some props leave something behind. A banana skin, a puddle, a lost horseshoe and a jockey
 * sitting at the rail all stay for the rest of the race, which is what turns a track into one
 * that has had a race on it.
 */

import { EVENTS_BY_ID } from '../data/events.js';
import { effectDuration } from '../engine/effects.js';
import { emitOnce, emitContinuous } from './eventEmitters.js';
import {
  SHOW_DURATION,
  drawBanana,
  drawPigeon,
  drawCarrot,
  drawCup,
  drawHorseshoe,
  drawFan,
  drawBubble,
  drawStreaker,
  drawTumbleweed,
  drawUfo,
  drawFlashes,
  drawPuddle,
  drawSittingJockey,
} from './eventProps.js';

/**
 * How each event shows itself.
 *
 * prop      drawn while the event is live, in screen space around the horse
 * emit      particles spawned every frame while it is live
 * once      particles spawned on the frame it fires
 * decor     what it leaves on the track afterwards
 * shake     camera trauma from 0 to 1
 * layer     'behind' draws under the horses, 'front' over them
 */
const VISUALS = {
  banana: { prop: 'banana', once: 'stars', decor: 'peel', shake: 0.45, layer: 'front' },
  stumble: { once: 'dust', emit: 'dust', shake: 0.55 },
  vomit: { emit: 'vomit', decor: 'puddleGreen' },
  pee: { emit: 'pee', decor: 'puddleYellow' },
  nap: { emit: 'zzz' },
  pigeon: { prop: 'pigeon', once: 'stars', layer: 'front' },
  hiccup: { prop: 'hiccup', emit: 'hiccup', layer: 'front' },
  mud: { once: 'mud', emit: 'mud' },
  selfie: { prop: 'fan', once: 'flash', layer: 'behind' },
  grass: { emit: 'grass' },
  confused: { emit: 'question' },
  wardrobe: { prop: 'horseshoe', once: 'sparks', decor: 'horseshoe' },
  carrot: { prop: 'carrot', emit: 'sparkle', layer: 'front' },
  rainbow_fart: { emit: 'rainbow' },
  jockey_off: { once: 'stars', decor: 'jockey' },
  espresso: { prop: 'cup', emit: 'hearts', layer: 'front' },
  tailwind: { emit: 'wind' },
  slipstream: { emit: 'wind' },
  rocket_boots: { emit: 'sparkle' },
  streaker: { prop: 'streaker', shake: 0.4, layer: 'front' },
  tumbleweed: { prop: 'tumbleweed', layer: 'behind' },
  camera_flash: { prop: 'flashes', layer: 'front' },
  ufo: { prop: 'ufo', layer: 'behind' },
};

/** How long a prop lingers after its effect has ended, in seconds. */
const PROP_TAIL = 0.8;

/**
 * Creates the visuals for one race.
 * @param {object} options
 * @param {object} options.particles
 * @param {(amount: number) => void} options.shake
 * @param {() => boolean} options.reducedMotion
 * @returns {object}
 */
export function createEventVisuals({ particles, shake, reducedMotion, cheer = () => {} }) {
  /** Props currently on screen. */
  let live = [];
  /** Things left on the track, in track units. */
  let decor = [];
  /** How many entries of the event log have been turned into visuals already. */
  let consumed = 0;
  /** Planned events whose prop has already been launched. */
  const launched = new Set();

  /** Starts fresh for a new race. */
  function reset() {
    live = [];
    decor = [];
    consumed = 0;
    launched.clear();
  }

  /**
   * Reads the race and starts anything new: props that need a run-up, and the burst of
   * particles the moment an event fires.
   * @param {object} race
   * @param {number} now seconds since the start
   */
  function sync(race, now) {
    // Props with a lead have to be in the air before their event fires.
    for (const planned of race.plannedEvents) {
      const visual = VISUALS[planned.id];
      if (!visual?.prop || launched.has(planned)) continue;
      if (now < planned.time - planned.lead) continue;
      launched.add(planned);

      const definition = EVENTS_BY_ID[planned.id];
      const duration = definition.effect ? effectDuration(definition.effect) : SHOW_DURATION;
      live.push({
        id: planned.id,
        runner: planned.runner,
        firesAt: planned.time,
        lead: Math.max(planned.lead, 0.001),
        endsAt: planned.time + Math.min(duration, 6) + PROP_TAIL,
        visual,
        seed: Math.random(),
        calm: reducedMotion(),
      });
    }

    // Everything that has actually fired: the one-off burst and the decor it leaves.
    const log = race.eventLog;
    while (consumed < log.length) {
      const entry = log[consumed];
      consumed += 1;
      const visual = VISUALS[entry.id];
      if (!visual) continue;

      if (visual.shake && !reducedMotion()) shake(visual.shake);
      cheer();
      if (visual.decor) {
        decor.push({ kind: visual.decor, runner: entry.runner, at: null, id: entry.id });
      }
      if (visual.once || visual.emit) {
        const definition = EVENTS_BY_ID[entry.id];
        const duration = definition?.effect ? effectDuration(definition.effect) : SHOW_DURATION;
        live.push({
          id: entry.id,
          runner: entry.runner,
          firesAt: entry.t,
          lead: 0.001,
          endsAt: entry.t + Math.min(duration, 6),
          visual,
          seed: Math.random(),
          pending: Boolean(visual.once),
        });
      }
    }
  }

  /**
   * Advances the props: spawns their particles and drops the finished ones.
   * @param {number} now
   * @param {(runner: number) => {x: number, y: number, size: number}|null} locate
   */
  function update(now, locate) {
    for (const item of live) {
      if (now < item.firesAt) continue;
      const place = item.runner >= 0 ? locate(item.runner) : null;
      if (!place) continue;

      if (item.pending) {
        item.pending = false;
        emitOnce(item.visual.once, place, particles);
        // A decor item remembers where it landed, in screen terms, via the runner it belongs to.
        for (const entry of decor) {
          if (entry.id === item.id && entry.at === null) entry.at = place.units;
        }
      }
      if (item.visual.emit && now < item.endsAt) emitContinuous(item.visual.emit, place, particles);
    }
    live = live.filter((item) => now < item.endsAt);
  }

  /**
   * Draws the props of one layer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {'behind'|'front'} layer
   * @param {number} now
   * @param {object} frame {locate, width, height}
   */
  function draw(ctx, layer, now, frame) {
    for (const item of live) {
      if (!item.visual.prop) continue;
      if ((item.visual.layer ?? 'front') !== layer) continue;

      const place = item.runner >= 0 ? frame.locate(item.runner) : null;
      // Show events have no horse: they play out across the middle of the picture.
      const anchor = place ?? { x: frame.width * 0.5, y: frame.height * 0.55, size: 60 };
      // -1 the moment the prop launches, 0 when it lands, then upwards.
      const phase = (now - item.firesAt) / item.lead;
      drawProp(ctx, item, anchor, phase, now - item.firesAt, frame);
    }
  }

  /**
   * Draws whatever previous events left on the track.
   * @param {CanvasRenderingContext2D} ctx
   * @param {(units: number, runner: number) => {x: number, y: number, size: number}} placeAt
   */
  function drawDecor(ctx, placeAt) {
    for (const entry of decor) {
      if (entry.at === null || entry.runner < 0) continue;
      const place = placeAt(entry.at, entry.runner);
      if (!place) continue;
      drawDecorItem(ctx, entry.kind, place);
    }
  }

  return {
    reset,
    sync,
    update,
    draw,
    drawDecor,
    get decorCount() {
      return decor.length;
    },
  };
}

/**
 * Draws one prop.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} item
 * @param {{x: number, y: number, size: number}} anchor
 * @param {number} phase -1 at launch, 0 on landing
 * @param {number} since seconds since the effect began, negative before
 * @param {object} frame
 */
function drawProp(ctx, item, anchor, phase, since, frame) {
  const { x, y, size } = anchor;
  const arriving = Math.min(1, Math.max(0, phase + 1));

  switch (item.visual.prop) {
    case 'banana': {
      // Sails in from above and lands exactly as the slide starts.
      const from = -size * 3;
      const bx = x + (1 - arriving) * size * 2.5;
      const by = y + from * (1 - arriving) - Math.sin(arriving * Math.PI) * size * 0.6;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate((1 - arriving) * 9 + 0.4);
      drawBanana(ctx, size * 0.17);
      ctx.restore();
      break;
    }
    case 'pigeon': {
      const px = x + (1 - arriving) * size * 4;
      const py = y - size * 1.5 - (1 - arriving) * size * 1.2 + Math.sin(since * 14) * size * 0.05;
      drawPigeon(ctx, px, py, size * 0.17, since);
      break;
    }
    case 'carrot': {
      const drop = Math.min(1, arriving);
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.beginPath();
      ctx.moveTo(x + size * 1.5, y - size * 3.2);
      ctx.lineTo(x + size * 1.15, y - size * (1.75 - 0.25 * drop));
      ctx.stroke();
      drawCarrot(ctx, x + size * 1.15, y - size * (1.6 - 0.25 * drop), size * 0.2);
      break;
    }
    case 'cup':
      drawCup(ctx, x + size * 0.95, y - size * 1.45, size * 0.19);
      break;
    case 'horseshoe': {
      // Sails away backwards, tumbling.
      const t = Math.max(0, since);
      ctx.save();
      ctx.translate(x - t * 200, y - size * 0.5 - Math.sin(Math.min(1, t) * Math.PI) * size * 1.4);
      ctx.rotate(t * 7);
      drawHorseshoe(ctx, size * 0.15);
      ctx.restore();
      break;
    }
    case 'fan':
      // At the rail just above the horse, where it is actually visible against the track.
      drawFan(ctx, x + size * 0.5, y - size * 1.75, size * 0.32, since);
      break;
    case 'hiccup':
      if (Math.sin(since * 6) > 0.4)
        drawBubble(ctx, x + size * 0.8, y - size * 1.7, size * 0.5, 'hicks');
      break;
    case 'streaker':
      drawStreaker(ctx, frame, since, item.seed);
      break;
    case 'tumbleweed': {
      const t = Math.max(0, since) / SHOW_DURATION;
      drawTumbleweed(ctx, frame.width * (t * 1.3 - 0.15), frame.height * 0.8, 22, since);
      break;
    }
    case 'ufo':
      drawUfo(ctx, frame, since, item.seed);
      break;
    case 'flashes':
      // Strobing is exactly what reduced motion is there to prevent.
      if (!item.calm) drawFlashes(ctx, frame, since);
      break;
    default:
      break;
  }
}

/** Draws one item of leftover decor. */
function drawDecorItem(ctx, kind, place) {
  const { x, y, size } = place;
  switch (kind) {
    case 'peel':
      ctx.save();
      ctx.translate(x, y - size * 0.04);
      ctx.rotate(0.5);
      ctx.scale(1, 0.45);
      drawBanana(ctx, size * 0.15);
      ctx.restore();
      break;
    case 'puddleGreen':
      drawPuddle(ctx, x, y, size * 0.42, 'rgba(110, 170, 70, 0.75)');
      break;
    case 'puddleYellow':
      drawPuddle(ctx, x, y, size * 0.3, 'rgba(240, 210, 90, 0.7)');
      break;
    case 'horseshoe':
      ctx.save();
      ctx.translate(x, y - size * 0.03);
      ctx.scale(1, 0.5);
      drawHorseshoe(ctx, size * 0.14);
      ctx.restore();
      break;
    case 'jockey':
      drawSittingJockey(ctx, x, y, size * 0.42);
      break;
    default:
      break;
  }
}
