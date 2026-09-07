/**
 * Tests for the effect maths (src/engine/effects.js).
 * Every event definition from data/events.js is checked here, so a typo in the data table
 * cannot quietly change how an event feels.
 */
import { describe, it, expect } from 'vitest';
import {
  envelope,
  effectDuration,
  effectModifier,
  effectAnimation,
  applyEffects,
} from '../../src/engine/effects.js';
import { EVENTS, SLIPSTREAM, EVENTS_BY_ID } from '../../src/data/events.js';

describe('envelope', () => {
  it('is zero before the effect starts', () => {
    expect(envelope(-1, 1, 0.2, 0.2)).toBe(0);
  });

  it('rises from 0 to 1 over the attack', () => {
    expect(envelope(0, 2, 0.4, 0.4)).toBe(0);
    expect(envelope(0.2, 2, 0.4, 0.4)).toBeCloseTo(0.5, 5);
    expect(envelope(0.4, 2, 0.4, 0.4)).toBeCloseTo(1, 5);
  });

  it('holds at 1 between attack and duration', () => {
    expect(envelope(1, 2, 0.4, 0.4)).toBeCloseTo(1, 5);
  });

  it('falls back to 0 over the release', () => {
    expect(envelope(2, 2, 0.4, 0.4)).toBeCloseTo(1, 5);
    expect(envelope(2.2, 2, 0.4, 0.4)).toBeCloseTo(0.5, 5);
    expect(envelope(2.4, 2, 0.4, 0.4)).toBe(0);
    expect(envelope(5, 2, 0.4, 0.4)).toBe(0);
  });

  it('stays at 1 forever for a sticky effect', () => {
    expect(envelope(0.1, Number.POSITIVE_INFINITY, 0.2, 0)).toBeCloseTo(0.5, 5);
    expect(envelope(1000, Number.POSITIVE_INFINITY, 0.2, 0)).toBe(1);
  });

  it('snaps straight to 1 without an attack, and to 0 without a release', () => {
    expect(envelope(0, 1, 0, 0)).toBe(1);
    expect(envelope(1.0001, 1, 0, 0)).toBe(0);
    expect(envelope(0, Number.POSITIVE_INFINITY, 0, 0)).toBe(1);
  });
});

describe('effectDuration', () => {
  it('is zero for an effect that does not exist', () => {
    expect(effectDuration(null)).toBe(0);
  });

  it('is duration plus release for a constant effect', () => {
    expect(effectDuration({ kind: 'constant', duration: 1.5, release: 0.4 })).toBeCloseTo(1.9);
  });

  it('sums every step of a sequence', () => {
    const effect = {
      kind: 'sequence',
      steps: [
        { duration: 0.6, release: 0.15 },
        { duration: 2, release: 0.4 },
      ],
    };
    expect(effectDuration(effect)).toBeCloseTo(3.15);
  });

  it('is infinite for a sticky effect', () => {
    const effect = { kind: 'constant', duration: Number.POSITIVE_INFINITY, release: 0 };
    expect(effectDuration(effect)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('effectModifier', () => {
  it('is zero before the start and after the end', () => {
    const effect = { kind: 'constant', mod: -1, duration: 1, attack: 0.1, release: 0.2 };
    expect(effectModifier(effect, -0.1)).toBe(0);
    // mod * 0 yields -0 for a negative modifier; toBeCloseTo does not split that hair.
    expect(effectModifier(effect, 5)).toBeCloseTo(0, 10);
  });

  it('reaches the full modifier while the effect holds', () => {
    const effect = { kind: 'constant', mod: -1, duration: 1, attack: 0.1, release: 0.2 };
    expect(effectModifier(effect, 0.5)).toBeCloseTo(-1, 5);
  });

  it('oscillates for a wave effect and averages out', () => {
    const effect = {
      kind: 'wave',
      amplitude: 0.2,
      frequency: 12,
      duration: 2,
      attack: 0,
      release: 0,
    };
    let sum = 0;
    let sawPositive = false;
    let sawNegative = false;
    for (let t = 0; t < 2; t += 0.001) {
      const value = effectModifier(effect, t);
      sum += value;
      if (value > 0.1) sawPositive = true;
      if (value < -0.1) sawNegative = true;
    }
    expect(sawPositive && sawNegative).toBe(true);
    expect(Math.abs(sum * 0.001)).toBeLessThan(0.02);
  });

  it('walks through the steps of a sequence in order', () => {
    const effect = {
      kind: 'sequence',
      steps: [
        { mod: -1, duration: 1, attack: 0, release: 0, anim: 'sleep' },
        { mod: 0.3, duration: 1, attack: 0, release: 0, anim: 'gallop_fast' },
      ],
    };
    expect(effectModifier(effect, 0.5)).toBeCloseTo(-1, 5);
    expect(effectModifier(effect, 1.5)).toBeCloseTo(0.3, 5);
    expect(effectModifier(effect, 2.5)).toBeCloseTo(0, 10);
  });

  it('returns zero for a missing effect or an unknown kind', () => {
    expect(effectModifier(null, 1)).toBe(0);
    expect(effectModifier({ kind: 'nonsense' }, 1)).toBe(0);
  });
});

describe('effectAnimation', () => {
  it('names the animation while the effect runs', () => {
    const effect = { kind: 'constant', mod: -1, duration: 1, attack: 0, release: 0, anim: 'vomit' };
    expect(effectAnimation(effect, 0.5)).toBe('vomit');
    expect(effectAnimation(effect, 2)).toBeNull();
  });

  it('follows a sequence through its steps', () => {
    const effect = {
      kind: 'sequence',
      steps: [
        { mod: -1, duration: 1, attack: 0, release: 0, anim: 'sleep' },
        { mod: 0.3, duration: 1, attack: 0, release: 0, anim: 'gallop_fast' },
      ],
    };
    expect(effectAnimation(effect, 0.5)).toBe('sleep');
    expect(effectAnimation(effect, 1.5)).toBe('gallop_fast');
    expect(effectAnimation(effect, 3)).toBeNull();
  });

  it('returns null before the start and for an effect without animation', () => {
    expect(effectAnimation(null, 1)).toBeNull();
    expect(
      effectAnimation({ kind: 'constant', duration: 1, release: 0, anim: null }, -1),
    ).toBeNull();
  });
});

describe('applyEffects', () => {
  /** Builds a slot the way race.js does. */
  const slot = (definition, startedAt, endsAt) => ({ definition, startedAt, endsAt, done: false });

  it('sums the active effects', () => {
    const slow = { effect: { kind: 'constant', mod: -0.3, duration: 2, attack: 0, release: 0 } };
    const fast = { effect: { kind: 'constant', mod: 0.5, duration: 2, attack: 0, release: 0 } };
    const active = [slot(slow, 0, 2), slot(fast, 0, 2)];
    expect(applyEffects(active, 2, 1)).toBeCloseTo(0.2, 5);
  });

  it('marks an effect done once it is over and stops counting it', () => {
    const definition = {
      effect: { kind: 'constant', mod: -1, duration: 1, attack: 0, release: 0 },
    };
    const active = [slot(definition, 0, 1)];
    expect(applyEffects(active, 1, 0.5)).toBeCloseTo(-1, 5);
    expect(applyEffects(active, 1, 1.5)).toBeCloseTo(0, 10);
    expect(active[0].done).toBe(true);
    expect(applyEffects(active, 1, 0.5)).toBeCloseTo(0, 10);
  });

  it('ignores slots beyond the active count', () => {
    const definition = {
      effect: { kind: 'constant', mod: -1, duration: 5, attack: 0, release: 0 },
    };
    const active = [slot(definition, 0, 5), slot(definition, 0, 5)];
    expect(applyEffects(active, 1, 1)).toBeCloseTo(-1, 5);
  });
});

describe('the event catalogue', () => {
  it('gives every event an id, a name, a weight and commentary', () => {
    for (const event of EVENTS) {
      expect(event.id, 'id').toMatch(/^[a-z_]+$/);
      expect(event.name.length, event.id).toBeGreaterThan(2);
      expect(event.weight, event.id).toBeGreaterThan(0);
      expect(event.commentary.length, event.id).toBeGreaterThanOrEqual(2);
      expect(['negative', 'positive', 'show']).toContain(event.kind);
    }
  });

  it('has unique ids', () => {
    const ids = EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives show events no effect and every other event one', () => {
    for (const event of EVENTS) {
      if (event.kind === 'show') expect(event.effect, event.id).toBeNull();
      else expect(event.effect, event.id).toBeTruthy();
    }
  });

  it('moves every negative event backwards and every positive one forwards', () => {
    for (const event of [...EVENTS, SLIPSTREAM]) {
      if (!event.effect || event.effect.kind === 'wave') continue;

      let total = 0;
      const span = Math.min(effectDuration(event.effect), 10);
      for (let t = 0; t < span; t += 0.01) total += effectModifier(event.effect, t) * 0.01;

      if (event.kind === 'negative') expect(total, event.id).toBeLessThan(0);
      if (event.kind === 'positive') expect(total, event.id).toBeGreaterThan(0);
    }
  });

  it('keeps every effect within a sane range', () => {
    for (const event of [...EVENTS, SLIPSTREAM]) {
      if (!event.effect) continue;
      const span = Math.min(effectDuration(event.effect), 10);
      for (let t = 0; t < span; t += 0.02) {
        const value = effectModifier(event.effect, t);
        expect(value, `${event.id} @ ${t.toFixed(2)}`).toBeGreaterThan(-2);
        expect(value, `${event.id} @ ${t.toFixed(2)}`).toBeLessThan(1);
      }
    }
  });

  it('keeps drinking rules to the shapes payout.js understands', () => {
    for (const event of EVENTS) {
      if (!event.drinkRule) continue;
      expect(event.drinkRule.sips, event.id).toBeGreaterThan(0);
      expect(['drink', 'deal'], event.id).toContain(event.drinkRule.direction);
      expect(['backers', 'everyone'], event.id).toContain(event.drinkRule.scope);
    }
  });

  it('gives every event a non-negative render lead', () => {
    for (const event of [...EVENTS, SLIPSTREAM]) {
      expect(event.lead, event.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('finds slipstream through the lookup as well', () => {
    expect(EVENTS_BY_ID.slipstream).toBe(SLIPSTREAM);
  });
});
