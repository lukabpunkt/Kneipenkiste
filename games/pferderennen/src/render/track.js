/**
 * Picks the track for the current orientation.
 *
 * Both tracks expose the same small interface, so the race screen never branches on orientation:
 * it asks the track where a horse's hooves go, how big to draw it, and which of the two horse
 * views to use. Everything that actually differs — vertical versus horizontal lanes, where the
 * grandstand sits, which way the gates swing — lives inside the two implementations.
 *
 * The engine is untouched by any of this. It works in track units and knows nothing about
 * screens (docs/02_ARCHITECTURE.md §7).
 */

import { RENDER } from '../config.js';
import { createLandscapeTrack } from './trackLandscape.js';
import { createPortraitTrack } from './trackPortrait.js';

/**
 * Which layout a viewport calls for.
 * @param {number} width
 * @param {number} height
 * @returns {'landscape'|'portrait'}
 */
export function orientationFor(width, height) {
  return width / Math.max(1, height) >= RENDER.landscapeAspect ? 'landscape' : 'portrait';
}

/**
 * Creates the track for an orientation.
 * @param {object} options
 * @param {object} options.camera
 * @param {object[]} options.horses
 * @param {'landscape'|'portrait'} options.orientation
 * @returns {object}
 */
export function createTrack({ camera, horses, orientation }) {
  return orientation === 'portrait'
    ? createPortraitTrack({ camera, horses })
    : createLandscapeTrack({ camera, horses });
}
