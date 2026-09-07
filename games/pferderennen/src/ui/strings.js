/**
 * Wording of the game in one place.
 *
 * The alcohol-free mode turns every "Schluck" into a "Punkt" without changing a single number
 * (docs/01_GAME_DESIGN.md §6). M7 grows this module into the full string table; for now it
 * carries what the screens of M1 actually need.
 */

/**
 * The word for the stake unit, correctly inflected.
 * @param {{sober?: boolean}} settings
 * @param {number} count
 * @returns {string} 'Schluck' | 'Schlücke' | 'Punkt' | 'Punkte'
 */
export function sipWord(settings, count) {
  if (settings?.sober) return count === 1 ? 'Punkt' : 'Punkte';
  return count === 1 ? 'Schluck' : 'Schlücke';
}

/**
 * Number plus unit, ready to print: "3 Schlücke".
 * @param {{sober?: boolean}} settings
 * @param {number} count
 * @returns {string}
 */
export function sips(settings, count) {
  return `${count} ${sipWord(settings, count)}`;
}

/** Human readable names of the bet types. */
export const BET_TYPE_LABELS = {
  win: 'Sieg',
  place: 'Platz',
  last: 'Letzter',
};

/**
 * One line explaining what a bet type pays.
 * @param {string} type
 * @returns {string}
 */
export function betTypeHint(type) {
  switch (type) {
    case 'place':
      return 'Wird dein Pferd 1., 2. oder 3., verteilst du den halben Einsatz.';
    case 'last':
      return 'Wird dein Pferd Letzter, verteilst du den doppelten Einsatz.';
    case 'win':
    default:
      return 'Gewinnt dein Pferd, verteilst du deinen Einsatz.';
  }
}
