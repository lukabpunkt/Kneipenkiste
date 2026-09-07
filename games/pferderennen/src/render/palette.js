/**
 * Derives the drawing palette of one horse from its data.
 *
 * Kept apart from horse.js so that anything wanting a horse's colours — the portraits on the
 * betting cards, the podium — does not have to pull in the whole renderer with it. That split
 * is what keeps the first paint small (see the lazy loading note in main.js).
 */

import { mix } from './shapes.js';
import { TRACK_COLOURS } from './trackTheme.js';

/**
 * Ink or paper on a given fill, whichever the eye can read.
 *
 * The six signature colours all want ink (5.6-13.1:1); their shades are split, because a mid
 * tone like Prosecco's #C94A78 sits almost exactly between the two. Picking per colour rather
 * than fixing one is the only way every horse clears the bar — this is the canvas half of the
 * rule the DOM badges follow in components.css (audit A4).
 *
 * @param {string} fill hex colour the text will sit on
 * @returns {string}
 */
export function textOn(fill) {
  return relativeLuminance(fill) > 0.179 ? TRACK_COLOURS.ink : TRACK_COLOURS.paper;
}

/** WCAG relative luminance. @param {string} hex @returns {number} */
function relativeLuminance(hex) {
  const channel = (i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

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
    ink: TRACK_COLOURS.ink,
    skin: '#F2C9A0',
    silkStripe: mix(horse.colorLight, '#FFFFFF', 0.45),
    white: TRACK_COLOURS.paper,
  };
}
