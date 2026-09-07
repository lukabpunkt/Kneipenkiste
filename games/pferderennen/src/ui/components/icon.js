/**
 * The icon set: inline SVG, drawn in the same language as the horses.
 *
 * Emoji used to do this job, and emoji are the wrong tool for it — every platform draws them
 * differently, they carry their own colours into a palette that was carefully built, and they sit
 * on the baseline like a foreign body because they belong to no typeface. Player avatars stay
 * emoji, because there they are not icons: they are the player.
 *
 * Every glyph is drawn on a 24 unit grid with a 2 unit stroke and round caps and joins, which is
 * the proportion `OUTLINE` gives the horses at their drawn size. Same hand, same weight.
 *
 * Icons are decoration for a name that is always present in text or in an aria-label, so they are
 * hidden from the accessibility tree without exception.
 */

const NS = 'http://www.w3.org/2000/svg';

/**
 * Path data on the 24-unit grid. Stroked, never filled, unless a shape needs a solid core.
 * @type {Record<string, string[]>}
 */
const PATHS = {
  /** A beer glass with a handle and a head on it — what a sip is measured in. */
  drink: ['M7 6h8l-1 13a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z', 'M15 9h2a2 2 0 0 1 0 5h-2', 'M7 10h8'],
  /** The winner's cup. */
  winner: [
    'M8 4h8v5a4 4 0 0 1-8 0z',
    'M8 6H5a3 3 0 0 0 3 3',
    'M16 6h3a3 3 0 0 1-3 3',
    'M12 13v4',
    'M9 20h6',
  ],
  /** The chequered flag on the start button. */
  start: ['M6 4v16', 'M6 5h12v8H6z', 'M6 5h4v4h4v4h-4V9H6z'],
  /** The house, for the round nobody won. */
  house: ['M4 11 12 4l8 7', 'M6 10v9h12v-9', 'M10 19v-5h4v5'],
  /** Dismiss. */
  close: ['M7 7l10 10', 'M17 7 7 17'],
  /** Remove a player. */
  remove: ['M7 7l10 10', 'M17 7 7 17'],
  /** Settings. */
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M12 2.5 13 5a7.5 7.5 0 0 1 2 .8l2.4-1 1.8 1.8-1 2.4a7.5 7.5 0 0 1 .8 2l2.5 1v2.4l-2.5.6a7.5 7.5 0 0 1-.8 2l1 2.4-1.8 1.8-2.4-1a7.5 7.5 0 0 1-2 .8L12 21.5l-1-2.5a7.5 7.5 0 0 1-2-.8l-2.4 1-1.8-1.8 1-2.4a7.5 7.5 0 0 1-.8-2L2.5 12l.5-2.4L5 9a7.5 7.5 0 0 1 .8-2l-1-2.4L6.6 2.8 9 3.8a7.5 7.5 0 0 1 2-.8z',
  ],
  /** Statistics. */
  stats: ['M5 20V10', 'M12 20V4', 'M19 20v-7', 'M3 20h18'],
  /** The rules. */
  rules: [
    'M12 18a5 5 0 0 1 8-4V5a5 5 0 0 0-8 4',
    'M12 18a5 5 0 0 0-8-4V5a5 5 0 0 1 8 4',
    'M12 9v9',
  ],
  /** The players. */
  players: [
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M3 20a6 6 0 0 1 12 0',
    'M16 5a3.5 3.5 0 0 1 0 7',
    'M17 14a6 6 0 0 1 4 6',
  ],
  /** Onward. */
  next: ['M5 12h13', 'M13 6l6 6-6 6'],
  back: ['M19 12H6', 'M11 6l-6 6 6 6'],
  plus: ['M12 6v12', 'M6 12h12'],
  minus: ['M6 12h12'],
  check: ['M5 13l4.5 4.5L19 7'],
  /** A horse's head, for the bet a player holds. */
  horse: ['M7 20c0-5 1-7 3-9l-2-4 4 1 2-3 3 3c3 2 4 5 4 8', 'M15 9.5h.01'],
};

/**
 * @param {keyof PATHS} name
 * @param {object} [options]
 * @param {number} [options.size] rendered edge length in px
 * @param {string} [options.className]
 * @returns {SVGElement}
 */
export function icon(name, { size = 24, className } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // Decoration: the name is always in the text beside it or in an aria-label.
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  if (className) svg.classList.add(className);

  for (const d of PATHS[name] ?? []) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
