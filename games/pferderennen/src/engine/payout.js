/**
 * Settles the bets against the finish order: who deals out sips and who drinks.
 *
 * Pure function without randomness. It works purely with ids and never learns which horse is
 * called what — the engine may not import data/horses.js (ESLint enforces this), so the human
 * readable text of an event rule is built by the UI, not here.
 *
 * Bet types (docs/01_GAME_DESIGN.md §5):
 *   win   the horse finishes first        -> deal the stake
 *   place the horse finishes in the top 3 -> deal half the stake, rounded up
 *   last  the horse finishes last         -> deal twice the stake
 * Losers always drink their full stake, whatever the bet type.
 */

/** How many places count as a placing in a 'place' bet. */
const PLACE_POSITIONS = 3;

/**
 * @typedef {{playerId: string, horseId: string, sips: number, type?: string}} Bet
 * @typedef {{sips: number, direction: 'drink'|'deal', scope: 'backers'|'everyone'}} DrinkRule
 * @typedef {{id: string, horseId?: string|null, drinkRule?: DrinkRule|null}} RaceEvent
 */

/**
 * Resolves which bet type applies. Only the 'free' setting lets each player choose their own.
 * @param {Bet} bet
 * @param {{betType?: string}} settings
 * @returns {string}
 */
function resolveType(bet, settings) {
  return settings.betType === 'free' ? (bet.type ?? 'win') : (settings.betType ?? 'win');
}

/**
 * Decides whether a bet won and how many sips its owner deals out.
 * @param {Bet} bet
 * @param {string[]} order finish order, index 0 is the winner
 * @param {string} type resolved bet type
 * @returns {number} sips to deal, or 0 when the bet lost
 */
function sipsWon(bet, order, type) {
  const position = order.indexOf(bet.horseId);
  if (position === -1) return 0;

  switch (type) {
    case 'place':
      return position < PLACE_POSITIONS ? Math.ceil(bet.sips / 2) : 0;
    case 'last':
      return position === order.length - 1 ? bet.sips * 2 : 0;
    case 'win':
    default:
      return position === 0 ? bet.sips : 0;
  }
}

/**
 * Turns the event log into drinking rules with the affected players resolved.
 * @param {RaceEvent[]} events
 * @param {Bet[]} bets
 * @param {{eventDrinkRules?: boolean}} settings
 * @returns {{eventId: string, horseId: string|null, playerIds: string[], sips: number, direction: string}[]}
 */
function collectEventRules(events, bets, settings) {
  if (settings.eventDrinkRules === false) return [];

  const rules = [];
  for (const event of events) {
    const rule = event.drinkRule;
    if (!rule) continue;

    const playerIds =
      rule.scope === 'everyone'
        ? bets.map((bet) => bet.playerId)
        : bets.filter((bet) => bet.horseId === event.horseId).map((bet) => bet.playerId);

    if (playerIds.length === 0) continue;
    rules.push({
      eventId: event.id,
      horseId: event.horseId ?? null,
      playerIds: [...new Set(playerIds)],
      sips: rule.sips,
      direction: rule.direction,
    });
  }
  return rules;
}

/**
 * Settles a finished race.
 * @param {{bets: Bet[], order: string[], settings: object, events?: RaceEvent[]}} input
 * @returns {{
 *   winners: {playerId: string, horseId: string, sipsToDeal: number, type: string}[],
 *   losers: {playerId: string, horseId: string, sipsToDrink: number, type: string}[],
 *   houseWins: boolean,
 *   eventRules: {eventId: string, horseId: string|null, playerIds: string[], sips: number, direction: string}[]
 * }}
 */
export function settle({ bets = [], order = [], settings = {}, events = [] }) {
  const winners = [];
  const losers = [];

  for (const bet of bets) {
    const type = resolveType(bet, settings);
    const sipsToDeal = sipsWon(bet, order, type);

    if (sipsToDeal > 0) {
      winners.push({ playerId: bet.playerId, horseId: bet.horseId, sipsToDeal, type });
    } else {
      losers.push({ playerId: bet.playerId, horseId: bet.horseId, sipsToDrink: bet.sips, type });
    }
  }

  return {
    winners,
    losers,
    // Nobody backed a winning horse: the house takes it and everyone drinks their stake.
    houseWins: bets.length > 0 && winners.length === 0,
    eventRules: collectEventRules(events, bets, settings),
  };
}
