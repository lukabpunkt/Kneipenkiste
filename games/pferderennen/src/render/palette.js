/**
 * Derives the drawing palette of one horse from its data.
 *
 * Kept apart from horse.js so that anything wanting a horse's colours — the portraits on the
 * betting cards, the podium — does not have to pull in the whole renderer with it. That split
 * is what keeps the first paint small (see the lazy loading note in main.js).
 */

import { mix } from './shapes.js';

/**
 * @param {object} horse entry from data/horses.js
 * @returns {object} the colours every drawing routine expects
 */
export function horseColours(horse) {
  return {
    coat: horse.coat,
    coatLight: mix(horse.coat, '#FFFFFF', 0.28),
    coatDark: horse.coatDark,
    coatDarker: mix(horse.coatDark, '#000000', 0.25),
    mane: horse.mane,
    ink: '#2B1D2E',
    skin: '#F2C9A0',
    silkStripe: mix(horse.colorLight, '#FFFFFF', 0.45),
    white: '#FFFFFF',
  };
}
