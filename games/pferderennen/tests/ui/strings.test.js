/**
 * Tests for the wording helpers (src/ui/strings.js).
 * The alcohol-free mode must change words and nothing else — never a number.
 */
import { describe, it, expect } from 'vitest';
import { sipWord, sips, betTypeHint, BET_TYPE_LABELS } from '../../src/ui/strings.js';
import { validateName } from '../../src/ui/screens/players.js';
import { BETTING } from '../../src/config.js';

describe('sipWord', () => {
  it('inflects the drinking wording', () => {
    expect(sipWord({}, 1)).toBe('Schluck');
    expect(sipWord({}, 2)).toBe('Schlücke');
  });

  it('switches to points in the alcohol-free mode', () => {
    expect(sipWord({ sober: true }, 1)).toBe('Punkt');
    expect(sipWord({ sober: true }, 3)).toBe('Punkte');
  });

  it('copes with missing settings', () => {
    expect(sipWord(undefined, 1)).toBe('Schluck');
  });
});

describe('sips', () => {
  it('keeps the number identical in both modes', () => {
    expect(sips({}, 4)).toBe('4 Schlücke');
    expect(sips({ sober: true }, 4)).toBe('4 Punkte');
  });
});

describe('betTypeHint', () => {
  it('explains every bet type and falls back to the win rule', () => {
    for (const type of Object.keys(BET_TYPE_LABELS)) {
      expect(betTypeHint(type).length).toBeGreaterThan(10);
    }
    expect(betTypeHint('unknown')).toBe(betTypeHint('win'));
  });
});

describe('validateName', () => {
  const players = [{ id: 'p1', name: 'Luka' }];

  it('accepts a normal name', () => {
    expect(validateName('Nina', players)).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(validateName('   ', players)).toMatch(/leer/);
  });

  it('rejects a name that is too long', () => {
    expect(validateName('x'.repeat(BETTING.maxNameLength + 1), players)).toMatch(/Zeichen/);
  });

  it('rejects a duplicate regardless of case', () => {
    expect(validateName('luka', players)).toMatch(/gibt es schon/);
  });

  it('lets a player keep their own name while renaming', () => {
    expect(validateName('Luka', players, 'p1')).toBeNull();
  });
});
