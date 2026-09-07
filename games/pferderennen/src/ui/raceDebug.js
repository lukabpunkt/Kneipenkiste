/**
 * Development instrumentation for the race screen, active only with ?debug=1.
 *
 * Kept out of the screen itself for two reasons: none of it is the game, and the counting proxy
 * costs a little on every drawing call — exactly the sort of thing that must not end up in the
 * hot path by accident.
 */

/** Canvas calls that count towards the per-frame path budget (docs/02_ARCHITECTURE.md §8). */
const COUNTED_CALLS = ['fill', 'stroke', 'fillRect', 'drawImage', 'fillText', 'clearRect'];

/**
 * Wraps a 2D context so it tallies its drawing calls.
 * @param {CanvasRenderingContext2D} target
 * @param {{ops: number}} counter
 * @returns {CanvasRenderingContext2D}
 */
export function countingContext(target, counter) {
  return new Proxy(target, {
    get(object, property) {
      const value = object[property];
      if (typeof value !== 'function') return value;
      if (!COUNTED_CALLS.includes(property)) return value.bind(object);
      return (...args) => {
        counter.ops += 1;
        return value.apply(object, args);
      };
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    },
  });
}

/**
 * The text of the debug overlay.
 * @param {object} state
 * @returns {string}
 */
export function debugReadout({
  seed,
  fps,
  updateMs,
  renderMs,
  particles,
  pathOps,
  orientation,
  zoom,
  quality,
  time,
}) {
  return (
    `Seed ${seed}\n` +
    `${fps} fps   Update ${updateMs.toFixed(2)} ms   Render ${renderMs.toFixed(2)} ms\n` +
    `Partikel ${particles}   Pfad-Ops ${pathOps}   ${orientation}\n` +
    `Zoom ${zoom.toFixed(2)}   Qualität ${quality}   t ${time.toFixed(1)} s`
  );
}

/**
 * Drives the debug overlay: it only rebuilds its text twice a second, because a readout that
 * changes 60 times a second is unreadable and costs more than what it measures.
 * @param {HTMLElement} panel
 * @param {boolean} enabled
 * @returns {{tick: (dt: number, snapshot: () => object) => void}}
 */
export function createReadout(panel, enabled) {
  /** How much simulated time has passed since the last rebuild. */
  const INTERVAL = 0.5;
  let elapsed = 0;

  return {
    tick(dt, snapshot) {
      if (!enabled) return;
      elapsed += dt;
      if (elapsed < INTERVAL) return;
      elapsed = 0;
      panel.textContent = debugReadout(snapshot());
    },
  };
}
