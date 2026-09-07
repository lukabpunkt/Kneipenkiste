/**
 * Tests for the bet settlement (src/engine/payout.js).
 * Table driven across all bet types, the house win, multiple winners on one horse and the
 * event drinking rules — audit A6 asks for 100 % branch coverage here.
 */
import { describe, it, expect } from 'vitest';
import { settle } from '../../src/engine/payout.js';

/** Finish order used throughout: hopfen wins, wodka is last. */
const ORDER = ['hopfen', 'morgana', 'prosecco', 'trabsalot', 'schnapsidee', 'wodka'];

/** Shorthand for a bet. */
const bet = (playerId, horseId, sips = 3, type) => ({ playerId, horseId, sips, type });

describe('bet type "win"', () => {
  const settings = { betType: 'win' };

  it('lets the backer of the winner deal out their full stake', () => {
    const result = settle({ bets: [bet('p1', 'hopfen', 4)], order: ORDER, settings });
    expect(result.winners).toEqual([
      { playerId: 'p1', horseId: 'hopfen', sipsToDeal: 4, type: 'win' },
    ]);
    expect(result.losers).toEqual([]);
    expect(result.houseWins).toBe(false);
  });

  it('makes everyone else drink their own stake', () => {
    const result = settle({
      bets: [bet('p1', 'hopfen', 4), bet('p2', 'morgana', 2)],
      order: ORDER,
      settings,
    });
    expect(result.losers).toEqual([
      { playerId: 'p2', horseId: 'morgana', sipsToDrink: 2, type: 'win' },
    ]);
  });

  it('pays out every player who backed the winning horse', () => {
    const result = settle({
      bets: [bet('p1', 'hopfen', 3), bet('p2', 'hopfen', 5), bet('p3', 'wodka', 1)],
      order: ORDER,
      settings,
    });
    expect(result.winners.map((w) => w.playerId)).toEqual(['p1', 'p2']);
    expect(result.winners.map((w) => w.sipsToDeal)).toEqual([3, 5]);
  });
});

describe('bet type "place"', () => {
  const settings = { betType: 'place' };

  it('pays half the stake, rounded up, for places one to three', () => {
    const result = settle({
      bets: [bet('p1', 'hopfen', 4), bet('p2', 'morgana', 3), bet('p3', 'prosecco', 1)],
      order: ORDER,
      settings,
    });
    expect(result.winners.map((w) => w.sipsToDeal)).toEqual([2, 2, 1]);
  });

  it('counts places four and worse as a loss at the full stake', () => {
    const result = settle({
      bets: [bet('p1', 'trabsalot', 6), bet('p2', 'wodka', 2)],
      order: ORDER,
      settings,
    });
    expect(result.winners).toEqual([]);
    expect(result.losers.map((l) => l.sipsToDrink)).toEqual([6, 2]);
  });
});

describe('bet type "last"', () => {
  const settings = { betType: 'last' };

  it('pays twice the stake for the horse that finishes last', () => {
    const result = settle({ bets: [bet('p1', 'wodka', 3)], order: ORDER, settings });
    expect(result.winners[0].sipsToDeal).toBe(6);
  });

  it('counts the winning horse as a loss', () => {
    const result = settle({ bets: [bet('p1', 'hopfen', 3)], order: ORDER, settings });
    expect(result.winners).toEqual([]);
    expect(result.losers[0].sipsToDrink).toBe(3);
  });
});

describe('bet type "free"', () => {
  const settings = { betType: 'free' };

  it('settles every player by their own chosen type', () => {
    const result = settle({
      bets: [
        bet('p1', 'hopfen', 4, 'win'),
        bet('p2', 'prosecco', 4, 'place'),
        bet('p3', 'wodka', 4, 'last'),
        bet('p4', 'morgana', 4, 'win'),
      ],
      order: ORDER,
      settings,
    });
    expect(result.winners.map((w) => [w.playerId, w.sipsToDeal])).toEqual([
      ['p1', 4],
      ['p2', 2],
      ['p3', 8],
    ]);
    expect(result.losers.map((l) => l.playerId)).toEqual(['p4']);
  });

  it('falls back to "win" when a bet carries no type', () => {
    const result = settle({ bets: [bet('p1', 'hopfen', 3)], order: ORDER, settings });
    expect(result.winners[0].type).toBe('win');
  });
});

describe('bet type resolution', () => {
  it('lets the global setting override a per-bet type unless the setting is "free"', () => {
    const result = settle({
      bets: [bet('p1', 'wodka', 3, 'last')],
      order: ORDER,
      settings: { betType: 'win' },
    });
    expect(result.winners).toEqual([]);
  });

  it('defaults to "win" when no setting is given at all', () => {
    const result = settle({ bets: [bet('p1', 'hopfen', 3)], order: ORDER, settings: {} });
    expect(result.winners).toHaveLength(1);
  });

  it('treats an unknown bet type as "win"', () => {
    const result = settle({
      bets: [bet('p1', 'hopfen', 3, 'nonsense')],
      order: ORDER,
      settings: { betType: 'free' },
    });
    expect(result.winners).toHaveLength(1);
  });
});

describe('the house wins', () => {
  it('is true when nobody backed a winning horse', () => {
    const result = settle({
      bets: [bet('p1', 'morgana'), bet('p2', 'wodka')],
      order: ORDER,
      settings: { betType: 'win' },
    });
    expect(result.houseWins).toBe(true);
    expect(result.losers).toHaveLength(2);
  });

  it('is false when there are no bets at all', () => {
    const result = settle({ bets: [], order: ORDER, settings: { betType: 'win' } });
    expect(result.houseWins).toBe(false);
    expect(result.winners).toEqual([]);
    expect(result.losers).toEqual([]);
  });
});

describe('robustness', () => {
  it('counts a horse missing from the order as a loss', () => {
    const result = settle({
      bets: [bet('p1', 'ghost', 3)],
      order: ORDER,
      settings: { betType: 'win' },
    });
    expect(result.losers).toHaveLength(1);
  });

  it('survives being called without any arguments', () => {
    const result = settle({});
    expect(result).toEqual({ winners: [], losers: [], houseWins: false, eventRules: [] });
  });
});

describe('event drinking rules', () => {
  const settings = { betType: 'win', eventDrinkRules: true };
  const bets = [bet('p1', 'hopfen'), bet('p2', 'morgana'), bet('p3', 'morgana')];

  it('hits exactly the backers of the affected horse', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings,
      events: [
        {
          id: 'banana',
          horseId: 'morgana',
          drinkRule: { sips: 1, direction: 'drink', scope: 'backers' },
        },
      ],
    });
    expect(result.eventRules).toEqual([
      {
        eventId: 'banana',
        horseId: 'morgana',
        playerIds: ['p2', 'p3'],
        sips: 1,
        direction: 'drink',
      },
    ]);
  });

  it('hits everyone for a rule with scope "everyone"', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings,
      events: [
        {
          id: 'hiccup',
          horseId: 'hopfen',
          drinkRule: { sips: 1, direction: 'drink', scope: 'everyone' },
        },
      ],
    });
    expect(result.eventRules[0].playerIds).toEqual(['p1', 'p2', 'p3']);
  });

  it('supports rules that let players deal out instead of drink', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings,
      events: [
        {
          id: 'jockey_off',
          horseId: 'hopfen',
          drinkRule: { sips: 1, direction: 'deal', scope: 'backers' },
        },
      ],
    });
    expect(result.eventRules[0]).toMatchObject({ direction: 'deal', playerIds: ['p1'] });
  });

  it('lists each affected player only once', () => {
    const result = settle({
      bets: [bet('p1', 'morgana'), bet('p1', 'morgana')],
      order: ORDER,
      settings,
      events: [
        {
          id: 'vomit',
          horseId: 'morgana',
          drinkRule: { sips: 1, direction: 'drink', scope: 'backers' },
        },
      ],
    });
    expect(result.eventRules[0].playerIds).toEqual(['p1']);
  });

  it('drops rules that affect nobody', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings,
      events: [
        {
          id: 'banana',
          horseId: 'wodka',
          drinkRule: { sips: 1, direction: 'drink', scope: 'backers' },
        },
      ],
    });
    expect(result.eventRules).toEqual([]);
  });

  it('skips events without a drinking rule, such as show events', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings,
      events: [{ id: 'tumbleweed', horseId: null }, { id: 'ufo' }],
    });
    expect(result.eventRules).toEqual([]);
  });

  it('reports no rules at all when the setting is off', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings: { betType: 'win', eventDrinkRules: false },
      events: [
        {
          id: 'banana',
          horseId: 'morgana',
          drinkRule: { sips: 1, direction: 'drink', scope: 'backers' },
        },
      ],
    });
    expect(result.eventRules).toEqual([]);
  });

  it('keeps a show event without a horse addressed to nobody in particular', () => {
    const result = settle({
      bets,
      order: ORDER,
      settings,
      events: [{ id: 'hiccup', drinkRule: { sips: 1, direction: 'drink', scope: 'everyone' } }],
    });
    expect(result.eventRules[0].horseId).toBeNull();
  });
});

describe('the bet-type matrix', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f'];

  /** Two players on the same horse, so every case also covers multiple winners. */
  const pair = (horseId) => [
    { playerId: 'p1', horseId, sips: 3 },
    { playerId: 'p2', horseId, sips: 4 },
  ];

  it.each([
    ['win', 'a', [3, 4]],
    ['place', 'c', [2, 2]],
    ['last', 'f', [6, 8]],
  ])('pays every backer under bet type "%s"', (betType, horseId, expected) => {
    const result = settle({ bets: pair(horseId), order, settings: { betType } });
    expect(result.winners.map((winner) => winner.sipsToDeal)).toEqual(expected);
    expect(result.losers).toEqual([]);
    expect(result.houseWins).toBe(false);
  });

  it.each([
    ['win', 'b'],
    ['place', 'd'],
    ['last', 'a'],
  ])('lets the house win under bet type "%s" when nobody hits', (betType, horseId) => {
    const result = settle({ bets: pair(horseId), order, settings: { betType } });
    expect(result.winners).toEqual([]);
    expect(result.houseWins).toBe(true);
    expect(result.losers.map((loser) => loser.sipsToDrink)).toEqual([3, 4]);
  });

  it('does not let the house win when only one of several players hits', () => {
    const result = settle({
      bets: [
        { playerId: 'p1', horseId: 'a', sips: 2 },
        { playerId: 'p2', horseId: 'e', sips: 5 },
      ],
      order,
      settings: { betType: 'win' },
    });
    expect(result.houseWins).toBe(false);
    expect(result.winners).toHaveLength(1);
    expect(result.losers).toHaveLength(1);
  });

  it('settles a mixed table under "free" including a house win for the losers only', () => {
    const result = settle({
      bets: [
        { playerId: 'p1', horseId: 'f', sips: 2, type: 'last' },
        { playerId: 'p2', horseId: 'f', sips: 2, type: 'win' },
        { playerId: 'p3', horseId: 'b', sips: 1, type: 'place' },
      ],
      order,
      settings: { betType: 'free' },
    });
    expect(result.winners).toEqual([
      { playerId: 'p1', horseId: 'f', sipsToDeal: 4, type: 'last' },
      { playerId: 'p3', horseId: 'b', sipsToDeal: 1, type: 'place' },
    ]);
    expect(result.losers).toEqual([{ playerId: 'p2', horseId: 'f', sipsToDrink: 2, type: 'win' }]);
    expect(result.houseWins).toBe(false);
  });
});
