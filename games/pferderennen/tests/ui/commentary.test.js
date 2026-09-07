/**
 * Tests for the commentator (src/ui/raceCommentary.js).
 *
 * Two promises from the milestone are checked here, because both are the kind of thing you only
 * notice after the fourth race of an evening: no line repeats within a race, and an event never
 * gets pushed off the display by a filler line (audit A1, "Kommentator liefert in 10 Rennen
 * keine doppelte Zeile").
 */
import { describe, it, expect } from 'vitest';
import { createCommentary } from '../../src/ui/raceCommentary.js';
import { TRACK_LENGTH } from '../../src/config.js';
import * as lines from '../../src/data/commentary.js';

/** Collects everything the commentator says. */
function fakeHud() {
  const said = [];
  const toasts = [];
  return {
    said,
    toasts,
    say: (text) => said.push(text),
    toast: (text) => toasts.push(text),
  };
}

const state = { players: [], bets: [], settings: { eventDrinkRules: true, sober: false } };
const make = (hud) => createCommentary({ hud, getState: () => state });

/** Six runners spread along the track; `leader` is the index that is in front. */
function field(leader, spread = 10) {
  return Array.from({ length: 6 }, (_, index) => ({
    index,
    x: index === leader ? 400 + spread : 400 - index,
  }));
}

describe('no repeats within a race', () => {
  it('says nothing twice in any of ten races', () => {
    // The milestone's Definition of Done, run literally: ten races at the longest duration the
    // game offers, sampled at 4 Hz, with the lead changing every three seconds.
    for (let race = 0; race < 10; race += 1) {
      const hud = fakeHud();
      const commentary = make(hud);
      commentary.reset();
      commentary.start();

      for (let tick = 0; tick <= 45 * 4; tick += 1) {
        commentary.update(field(Math.floor(tick / 12) % 6), tick / 4);
      }

      expect(hud.said.length).toBeGreaterThan(10);
      expect(new Set(hud.said).size).toBe(hud.said.length);
    }
  });

  it('works through a pool before it starts over', () => {
    // A race long enough to exhaust the pools has to reuse lines eventually — but only after it
    // has actually used them all, which is what the release in `pick()` guarantees.
    const hud = fakeHud();
    const commentary = make(hud);
    commentary.reset();
    commentary.start();
    for (let step = 0; step < 600; step += 1) commentary.update(field(step % 6), step * 0.5);

    const firstRepeat = (() => {
      const seen = new Set();
      for (let i = 0; i < hud.said.length; i += 1) {
        if (seen.has(hud.said[i])) return i;
        seen.add(hud.said[i]);
      }
      return hud.said.length;
    })();

    // Nothing repeats until at least the smallest pool in play has been used up.
    expect(firstRepeat).toBeGreaterThanOrEqual(lines.LEAD_LINES.length);
  });
});

describe('priority', () => {
  it('does not let a filler line push an event off the display', () => {
    const hud = fakeHud();
    const commentary = make(hud);
    commentary.reset();

    const race = {
      state: { t: 10 },
      eventLog: [{ id: 'banana', runner: 0, t: 10 }],
      runners: field(0),
    };
    commentary.read(race, 10);
    const afterEvent = hud.said.length;

    // A filler is due, but the event still holds the line.
    commentary.update(field(0), 10.5);
    expect(hud.said.length).toBe(afterEvent);
  });

  it('lets a later event replace an earlier one', () => {
    const hud = fakeHud();
    const commentary = make(hud);
    commentary.reset();

    commentary.read({ eventLog: [{ id: 'banana', runner: 0, t: 5 }] }, 5);
    commentary.read(
      {
        eventLog: [
          { id: 'banana', runner: 0, t: 5 },
          { id: 'vomit', runner: 1 },
        ],
      },
      5.2,
    );
    expect(hud.said).toHaveLength(2);
  });

  it('always speaks the win line, whatever is on screen', () => {
    const hud = fakeHud();
    const commentary = make(hud);
    commentary.reset();

    commentary.read({ eventLog: [{ id: 'banana', runner: 0, t: 30 }] }, 30);
    commentary.win({ name: 'Hopfen Hengst', id: 'hopfen' }, false, 30.1);
    expect(hud.said.at(-1)).toContain('Hopfen Hengst');
  });
});

describe('the line pools', () => {
  it('has more than the 80 lines the milestone asks for', () => {
    const total = Object.values(lines).reduce(
      (sum, pool) => sum + (Array.isArray(pool) ? pool.length : Object.values(pool).flat().length),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(80);
  });

  it('fills the {horse} placeholder in every lead line', () => {
    const hud = fakeHud();
    const commentary = make(hud);
    commentary.reset();
    commentary.update(field(0), 0);
    for (let step = 1; step < 60; step += 1) commentary.update(field(step % 6), step);
    expect(hud.said.some((line) => line.includes('{horse}'))).toBe(false);
  });

  it('marks the final stretch exactly once', () => {
    const hud = fakeHud();
    const commentary = make(hud);
    commentary.reset();

    const late = () => [
      { index: 0, x: TRACK_LENGTH * 0.9 },
      { index: 1, x: TRACK_LENGTH * 0.8 },
    ];
    for (let step = 0; step < 20; step += 1) commentary.update(late(), step);

    const stretch = hud.said.filter((line) => lines.FINAL_STRETCH_LINES.includes(line));
    expect(stretch).toHaveLength(1);
  });
});
