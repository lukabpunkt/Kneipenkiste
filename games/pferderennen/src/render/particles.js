/**
 * Particle system with a fixed object pool.
 *
 * Everything lives in typed arrays allocated once, so a race never allocates a particle and the
 * garbage collector has nothing to do mid-race (docs/02_ARCHITECTURE.md §8). Dead particles are
 * swapped with the last live one, which keeps the live range contiguous.
 *
 * Under reduced motion, and when the quality has stepped down, the pool is thinned rather than
 * switched off: the events stay readable, they just cost less (docs/04_DESIGN_SYSTEM.md §9).
 */

import { EFFECTS, RENDER } from '../config.js';
import { quality } from './quality.js';

/** Particle kinds, as small integers so they fit in a typed array. */
export const DUST = 0;
export const CONFETTI = 1;
export const STAR = 2;
export const SPARKLE = 3;
export const RAINBOW = 4;
export const SPLASH = 5;
export const ZZZ = 6;
export const HEART = 7;
export const QUESTION = 8;
export const SPEEDLINE = 9;
export const CLOD = 10;

/**
 * How each kind behaves and looks.
 * `gravity` is in pixels per second squared, negative pulls upwards on screen.
 * `shape` picks the drawing routine.
 */
const KINDS = [
  { colour: '198, 160, 106', gravity: -14, drag: 2.6, shape: 'blob', alpha: 0.55 },
  { colour: null, gravity: 220, drag: 0.6, shape: 'flake', alpha: 1 },
  { colour: '255, 214, 84', gravity: -30, drag: 2, shape: 'star', alpha: 0.95 },
  { colour: '255, 255, 255', gravity: -50, drag: 2.4, shape: 'star', alpha: 0.9 },
  { colour: null, gravity: -10, drag: 3, shape: 'bar', alpha: 0.8 },
  { colour: '110, 170, 70', gravity: 320, drag: 0.4, shape: 'blob', alpha: 0.9 },
  { colour: '255, 255, 255', gravity: -34, drag: 1.6, shape: 'glyph', alpha: 0.95, glyph: 'z' },
  { colour: '236, 72, 153', gravity: -40, drag: 2, shape: 'glyph', alpha: 0.95, glyph: '♥' },
  { colour: '43, 29, 46', gravity: -32, drag: 2, shape: 'glyph', alpha: 0.9, glyph: '?' },
  { colour: '255, 255, 255', gravity: 0, drag: 1.2, shape: 'bar', alpha: 0.55 },
  // Kicked-up turf: heavier than dust, so it arcs and comes back down.
  { colour: '150, 108, 62', gravity: 520, drag: 0.5, shape: 'blob', alpha: 0.95 },
];

/** Rainbow stripe colours, cycled by the trail. */
const RAINBOW_COLOURS = [
  '239,68,68',
  '245,158,11',
  '250,204,21',
  '34,197,94',
  '6,182,212',
  '139,92,246',
];

/**
 * @param {number} capacity how many particles may be alive at once
 * @returns {object}
 */
export function createParticles(capacity = RENDER.particlePoolSize) {
  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const life = new Float32Array(capacity);
  const maxLife = new Float32Array(capacity);
  const size = new Float32Array(capacity);
  const spin = new Float32Array(capacity);
  const spinRate = new Float32Array(capacity);
  const tint = new Uint8Array(capacity);
  const kind = new Uint8Array(capacity);
  let count = 0;

  /** Set by the renderer; thins every spawn without touching the events themselves. */
  let density = 1;

  const api = {
    get count() {
      return count;
    },

    /** Drops every particle, for a fresh race. */
    clear() {
      count = 0;
    },

    /**
     * Sets how many particles actually get spawned, from 0 to 1.
     * Reduced motion asks for a 70 % cut (docs/04_DESIGN_SYSTEM.md §9).
     * @param {number} value
     */
    setDensity(value) {
      density = value;
    },

    /**
     * Adds one particle. Silently does nothing when the pool is full, which is the right
     * behaviour for decoration: a missing speck of dust beats a dropped frame.
     */
    spawn(type, atX, atY, options = {}) {
      if (count >= capacity) return;
      if (density < 1 && Math.random() > density) return;

      const {
        speedX = 0,
        speedY = 0,
        radius = 4,
        seconds = 0.6,
        rotation = 0,
        rotationRate = 0,
        colourIndex = 0,
      } = options;

      const i = count;
      count += 1;
      x[i] = atX;
      y[i] = atY;
      vx[i] = speedX;
      vy[i] = speedY;
      life[i] = seconds;
      maxLife[i] = seconds;
      size[i] = radius;
      spin[i] = rotation;
      spinRate[i] = rotationRate;
      tint[i] = colourIndex;
      kind[i] = type;
    },

    /**
     * A puff of dust where a hoof struck the ground.
     * @param {number} atX
     * @param {number} atY
     * @param {number} scale how big the horse is, so distant lanes kick up less
     * @param {number} intensity 1 at a normal gallop, more when sprinting
     */
    hoofDust(atX, atY, scale, intensity = 1) {
      const puffs = quality.level === 'low' ? 1 : intensity > 1.2 ? 3 : 2;
      for (let i = 0; i < puffs; i += 1) {
        api.spawn(DUST, atX + (Math.random() - 0.5) * scale * 0.2, atY, {
          speedX: -(18 + Math.random() * 34) * intensity * (scale / 60),
          speedY: -(6 + Math.random() * 16) * (scale / 60),
          radius: scale * (0.05 + Math.random() * 0.05),
          seconds: 0.35 + Math.random() * 0.3,
        });
      }

      // A clod of turf on top of the dust, but only sometimes and only at pace — turf flying off
      // every single hoofbeat of six horses would be a snowstorm.
      if (quality.level === 'low' || intensity < EFFECTS.clodFromSpeed) return;
      if (Math.random() > EFFECTS.clodChance) return;
      api.spawn(CLOD, atX, atY, {
        speedX: -(60 + Math.random() * 90) * (scale / 60),
        speedY: -(70 + Math.random() * 80) * (scale / 60),
        radius: scale * (0.035 + Math.random() * 0.03),
        seconds: 0.9,
        rotation: Math.random() * Math.PI,
        rotationRate: (Math.random() - 0.5) * 12,
      });
    },

    /**
     * Streaks behind a horse that is genuinely flying. Drawn as bars pointing the way it runs.
     * @param {number} atX
     * @param {number} atY
     * @param {number} scale
     * @param {number} intensity above 1 is faster than a normal gallop
     */
    speedLines(atX, atY, scale, intensity) {
      if (quality.level === 'low') return;
      if (Math.random() > EFFECTS.speedLineChance) return;
      api.spawn(SPEEDLINE, atX, atY + (Math.random() - 0.5) * scale * 0.5, {
        speedX: -(150 + Math.random() * 120) * (scale / 60),
        speedY: 0,
        radius: scale * (0.12 + Math.random() * 0.14) * intensity,
        seconds: 0.28,
      });
    },

    /**
     * A burst of particles in every direction, which is what most events need.
     * @param {number} type
     * @param {number} atX
     * @param {number} atY
     * @param {object} options
     */
    burst(type, atX, atY, { amount = 8, speed = 90, radius = 5, seconds = 0.7, spread = 1 } = {}) {
      for (let i = 0; i < amount; i += 1) {
        const angle = Math.PI * 2 * (i / amount) + Math.random() * 0.5;
        const power = speed * (0.5 + Math.random() * 0.7);
        api.spawn(type, atX, atY, {
          speedX: Math.cos(angle) * power * spread,
          speedY: Math.sin(angle) * power,
          radius: radius * (0.7 + Math.random() * 0.6),
          seconds: seconds * (0.7 + Math.random() * 0.6),
          rotation: Math.random() * Math.PI,
          rotationRate: (Math.random() - 0.5) * 9,
          colourIndex: i % RAINBOW_COLOURS.length,
        });
      }
    },

    /**
     * Advances every live particle and retires the finished ones.
     * @param {number} dt
     */
    update(dt) {
      for (let i = 0; i < count; i += 1) {
        const behaviour = KINDS[kind[i]];
        life[i] -= dt;
        if (life[i] <= 0) {
          // Swap with the last live particle so the live range stays contiguous.
          count -= 1;
          x[i] = x[count];
          y[i] = y[count];
          vx[i] = vx[count];
          vy[i] = vy[count];
          life[i] = life[count];
          maxLife[i] = maxLife[count];
          size[i] = size[count];
          spin[i] = spin[count];
          spinRate[i] = spinRate[count];
          tint[i] = tint[count];
          kind[i] = kind[count];
          i -= 1;
          continue;
        }
        const drag = 1 - behaviour.drag * dt;
        vx[i] *= drag;
        vy[i] = vy[i] * drag + behaviour.gravity * dt;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        spin[i] += spinRate[i] * dt;
      }
    },

    /**
     * Draws every live particle.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
      for (let i = 0; i < count; i += 1) {
        const behaviour = KINDS[kind[i]];
        const age = life[i] / maxLife[i];
        const colour = behaviour.colour ?? RAINBOW_COLOURS[tint[i] % RAINBOW_COLOURS.length];
        const alpha = age * behaviour.alpha;

        switch (behaviour.shape) {
          case 'flake':
            ctx.save();
            ctx.translate(x[i], y[i]);
            ctx.rotate(spin[i]);
            ctx.fillStyle = `rgba(${colour}, ${Math.min(1, alpha * 1.6)})`;
            ctx.fillRect(-size[i] * 0.5, -size[i] * 0.28, size[i], size[i] * 0.56);
            ctx.restore();
            break;

          case 'bar':
            ctx.strokeStyle = `rgba(${colour}, ${alpha})`;
            ctx.lineWidth = size[i] * 0.55;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x[i], y[i]);
            ctx.lineTo(x[i] - size[i] * 2.4, y[i]);
            ctx.stroke();
            break;

          case 'star':
            ctx.save();
            ctx.translate(x[i], y[i]);
            ctx.rotate(spin[i]);
            ctx.fillStyle = `rgba(${colour}, ${alpha})`;
            ctx.beginPath();
            for (let point = 0; point < 4; point += 1) {
              const a = (point / 4) * Math.PI * 2;
              ctx.lineTo(Math.cos(a) * size[i], Math.sin(a) * size[i]);
              ctx.lineTo(
                Math.cos(a + Math.PI / 4) * size[i] * 0.35,
                Math.sin(a + Math.PI / 4) * size[i] * 0.35,
              );
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;

          case 'glyph':
            ctx.fillStyle = `rgba(${colour}, ${alpha})`;
            ctx.font = `700 ${size[i] * 2.4}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(behaviour.glyph, x[i], y[i]);
            break;

          case 'blob':
          default:
            ctx.fillStyle = `rgba(${colour}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x[i], y[i], size[i] * (1.5 - age * 0.5), 0, Math.PI * 2);
            ctx.fill();
            break;
        }
      }
    },
  };

  return api;
}
