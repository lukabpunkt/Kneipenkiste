/**
 * Fairness guard at the data level.
 *
 * The top project rule is that horses differ cosmetically and in no other way. This test raises
 * the alarm as soon as anyone attaches a gameplay-relevant value to a horse — long before such a
 * value would show up as a bias in the fairness audit.
 */
import { describe, it, expect } from 'vitest';
import { HORSES, HORSES_BY_ID, horseByIndex } from '../../src/data/horses.js';
import { RUNNER_COUNT } from '../../src/config.js';

/** Fields a horse is allowed to have. Anything else is a fairness violation. */
const ALLOWED_KEYS = [
  'id',
  'number',
  'name',
  'color',
  'colorLight',
  'colorDark',
  'coat',
  'coatDark',
  'mane',
  'accessory',
  'character',
  'commentary',
];

describe('HORSES', () => {
  it('holds exactly as many horses as the engine has runners', () => {
    expect(HORSES).toHaveLength(RUNNER_COUNT);
  });

  it('has unique ids, names, starting numbers and signature colours', () => {
    for (const key of ['id', 'name', 'number', 'color']) {
      const values = HORSES.map((horse) => horse[key]);
      expect(new Set(values).size, `${key} is not unique`).toBe(HORSES.length);
    }
  });

  it('assigns the starting numbers 1 to 6', () => {
    expect(HORSES.map((horse) => horse.number).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('carries no gameplay-relevant values at all, only cosmetics', () => {
    for (const horse of HORSES) {
      const extra = Object.keys(horse).filter((key) => !ALLOWED_KEYS.includes(key));
      expect(extra, `${horse.id} has disallowed fields: ${extra.join(', ')}`).toEqual([]);
    }
  });

  it('contains no numeric values besides the purely visual starting number', () => {
    for (const horse of HORSES) {
      for (const [key, value] of Object.entries(horse)) {
        if (key === 'number') continue;
        expect(typeof value, `${horse.id}.${key} is a number`).not.toBe('number');
      }
    }
  });

  it('provides at least six commentary lines per horse', () => {
    for (const horse of HORSES) {
      expect(horse.commentary.length, horse.id).toBeGreaterThanOrEqual(6);
      expect(new Set(horse.commentary).size, `${horse.id} repeats lines`).toBe(
        horse.commentary.length,
      );
    }
  });

  it('uses valid hex values for every colour', () => {
    for (const horse of HORSES) {
      for (const key of ['color', 'colorLight', 'colorDark', 'coat', 'coatDark', 'mane']) {
        expect(horse[key], `${horse.id}.${key}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('lookup helpers', () => {
  it('finds every horse through HORSES_BY_ID', () => {
    for (const horse of HORSES) {
      expect(HORSES_BY_ID[horse.id]).toBe(horse);
    }
  });

  it('maps runner indices 0..5 to the horses in starting-number order', () => {
    for (let index = 0; index < RUNNER_COUNT; index += 1) {
      expect(horseByIndex(index).number).toBe(index + 1);
    }
  });
});
