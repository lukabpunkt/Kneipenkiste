/**
 * The particles each event throws off.
 *
 * Split from eventVisuals.js because it is a long lookup table rather than logic: one case per
 * event, saying what it sprays and how fast. The particle system itself is in particles.js.
 */

import {
  DUST,
  CONFETTI,
  STAR,
  SPARKLE,
  RAINBOW,
  SPLASH,
  ZZZ,
  HEART,
  QUESTION,
  SPEEDLINE,
} from './particles.js';

/** The one-off burst when an event fires. */
export function emitOnce(name, place, particles) {
  const { x, y, size } = place;
  switch (name) {
    case 'stars':
      particles.burst(STAR, x, y - size * 0.8, { amount: 8, speed: 110, radius: size * 0.09 });
      break;
    case 'dust':
      particles.burst(DUST, x, y, { amount: 10, speed: 90, radius: size * 0.1, spread: 1.4 });
      break;
    case 'mud':
      particles.burst(SPLASH, x, y - size * 0.1, { amount: 10, speed: 130, radius: size * 0.07 });
      break;
    case 'sparks':
      particles.burst(SPARKLE, x, y - size * 0.3, { amount: 8, speed: 130, radius: size * 0.07 });
      break;
    case 'flash':
      particles.burst(SPARKLE, x, y - size * 1.1, { amount: 6, speed: 60, radius: size * 0.12 });
      break;
    default:
      break;
  }
}

/** Particles spawned every frame while an event lasts. */
export function emitContinuous(name, place, particles) {
  const { x, y, size } = place;
  const chance = (probability) => Math.random() < probability;

  switch (name) {
    case 'vomit':
      if (chance(0.7)) {
        particles.spawn(SPLASH, x + size * 0.7, y - size * 1.0, {
          speedX: 40 + Math.random() * 60,
          speedY: -30 - Math.random() * 40,
          radius: size * (0.05 + Math.random() * 0.05),
          seconds: 0.6,
        });
      }
      break;
    case 'pee':
      if (chance(0.5)) {
        particles.spawn(SPLASH, x - size * 0.1, y - size * 0.4, {
          speedX: -10 + Math.random() * 20,
          speedY: 20 + Math.random() * 30,
          radius: size * 0.035,
          seconds: 0.35,
        });
      }
      break;
    case 'mud':
      if (chance(0.35)) {
        particles.spawn(SPLASH, x, y - size * 0.05, {
          speedX: -40 - Math.random() * 60,
          speedY: -40 - Math.random() * 60,
          radius: size * 0.05,
          seconds: 0.5,
        });
      }
      break;
    case 'zzz':
      if (chance(0.09)) {
        particles.spawn(ZZZ, x + size * 0.55, y - size * 1.25, {
          speedX: 14,
          speedY: -26,
          radius: size * 0.12,
          seconds: 1.5,
        });
      }
      break;
    case 'question':
      if (chance(0.11)) {
        particles.spawn(QUESTION, x, y - size * 1.45, {
          speedX: (Math.random() - 0.5) * 30,
          speedY: -20,
          radius: size * 0.13,
          seconds: 1.1,
        });
      }
      break;
    case 'rainbow':
      particles.spawn(
        RAINBOW,
        x - size * 0.5,
        y - size * 0.55 + (Math.random() - 0.5) * size * 0.3,
        {
          speedX: -70,
          radius: size * 0.14,
          seconds: 0.7,
          colourIndex: Math.floor(Math.random() * 6),
        },
      );
      break;
    case 'sparkle':
      if (chance(0.6)) {
        particles.spawn(
          SPARKLE,
          x + (Math.random() - 0.5) * size,
          y - size * (0.3 + Math.random()),
          {
            speedX: -30,
            speedY: -20,
            radius: size * 0.06,
            seconds: 0.5,
            rotation: Math.random() * 3,
            rotationRate: 4,
          },
        );
      }
      break;
    case 'hearts':
      if (chance(0.1)) {
        particles.spawn(HEART, x + size * 0.4, y - size * 1.3, {
          speedX: 10,
          speedY: -24,
          radius: size * 0.1,
          seconds: 1.1,
        });
      }
      break;
    case 'grass':
      if (chance(0.5)) {
        particles.spawn(SPLASH, x + size * 0.65, y - size * 0.15, {
          speedX: 30 + Math.random() * 50,
          speedY: -60 - Math.random() * 50,
          radius: size * 0.035,
          seconds: 0.7,
        });
      }
      break;
    case 'wind':
      if (chance(0.55)) {
        particles.spawn(SPEEDLINE, x - size * 0.3, y - size * (0.3 + Math.random() * 0.9), {
          speedX: -160 - Math.random() * 120,
          radius: size * 0.09,
          seconds: 0.35,
        });
      }
      break;
    case 'dust':
      if (chance(0.4)) {
        particles.spawn(DUST, x, y, {
          speedX: -30 - Math.random() * 40,
          speedY: -10,
          radius: size * 0.07,
          seconds: 0.45,
        });
      }
      break;
    case 'hiccup':
      if (chance(0.08)) {
        particles.burst(CONFETTI, x, y - size * 1.2, {
          amount: 3,
          speed: 50,
          radius: size * 0.05,
          seconds: 0.5,
        });
      }
      break;
    default:
      break;
  }
}
