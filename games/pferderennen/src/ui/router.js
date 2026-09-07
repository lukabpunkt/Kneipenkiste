/**
 * Screen router: renders the screen matching state.screen and animates transitions.
 *
 * Navigation is hash based, so the browser back button works and a reload lands on the same
 * screen (audit A1). Guards make sure a hand-typed hash cannot drop the player into a screen
 * that has no data yet — a race without bets simply redirects back to the betting screen.
 *
 * A screen may be given as a module or as a function returning one. The race screen pulls in the
 * whole renderer — horses, track, props, particles — which nobody needs before they have placed
 * a bet, so it is loaded on demand and the first paint stays small.
 */

import { BETTING } from '../config.js';
import { closeAllModals } from './components/modal.js';

/** How long the leave animation runs; must match --dur-base in tokens.css. */
const TRANSITION_MS = 220;

/**
 * Decides whether a screen may be shown with the current state.
 * @param {string} screen
 * @param {any} state
 * @returns {string} the screen itself, or the closest reachable one
 */
export function resolveScreen(screen, state) {
  const hasPlayers = state.players.length >= BETTING.minPlayers;
  const everyoneHasBet = hasPlayers && state.bets.length === state.players.length;

  switch (screen) {
    case 'players':
      return 'players';
    case 'betting':
      return hasPlayers ? 'betting' : 'players';
    case 'race':
      if (!hasPlayers) return 'players';
      return everyoneHasBet ? 'race' : 'betting';
    case 'results':
      if (!hasPlayers) return 'players';
      return state.race.result ? 'results' : 'betting';
    case 'start':
    default:
      return 'start';
  }
}

/**
 * Creates the router.
 * @param {object} options
 * @param {{getState: () => any, dispatch: Function, subscribe: Function}} options.store
 * @param {HTMLElement} options.container
 * @param {Record<string, {mount: Function, unmount: Function}>} options.screens
 * @returns {{start: () => void, stop: () => void}}
 */
export function createRouter({ store, container, screens }) {
  let currentName = null;
  let currentModule = null;
  let unsubscribe = null;
  let transitionTimer = null;
  /** Guards against two loads overlapping: only the newest one may mount. */
  let renderToken = 0;
  /** Modules already loaded, so a screen is only fetched once. */
  const loaded = new Map();

  /**
   * Resolves a screen entry, loading it if it is lazy.
   * @param {string} name
   * @returns {Promise<{mount: Function, unmount: Function}>}
   */
  async function resolve(name) {
    if (loaded.has(name)) return loaded.get(name);
    const entry = screens[name];
    const module = typeof entry === 'function' ? await entry() : entry;
    loaded.set(name, module);
    return module;
  }

  /** Reads the screen name out of the URL hash. */
  const screenFromHash = () => window.location.hash.replace(/^#\/?/, '') || 'start';

  /** Writes the screen into the hash without adding a second identical history entry. */
  const syncHash = (screen) => {
    const target = `#/${screen}`;
    if (window.location.hash !== target) window.location.hash = target;
  };

  /** Swaps the mounted screen, running the leave animation first. */
  async function render(name) {
    if (name === currentName) return;

    // An overlay belongs to the screen that opened it and must not outlive it.
    closeAllModals();

    const token = ++renderToken;
    const module = await resolve(name);
    // Somebody navigated again while this screen was loading; that navigation wins.
    if (token !== renderToken) return;

    const previous = container.firstElementChild;
    currentModule?.unmount();
    currentModule = module;
    currentName = name;

    const view = document.createElement('div');
    // The very first screen does not fade in. Partly because fading in the page you just opened
    // looks like a stutter, and partly because Chrome does not count an element whose first
    // paint is transparent as a Largest Contentful Paint candidate — the page would report no
    // LCP at all, which is both a bad metric and a bad description of what the player sees.
    view.className = previous ? 'screen screen--entering' : 'screen';
    view.dataset.screen = name;

    if (previous) {
      previous.classList.add('screen--leaving');
      if (transitionTimer !== null) clearTimeout(transitionTimer);
      transitionTimer = setTimeout(() => previous.remove(), TRANSITION_MS);
    }

    container.append(view);
    module.mount(view, store);

    if (previous) {
      // Force a reflow so the entering class actually animates instead of being skipped.
      void view.offsetWidth;
      view.classList.remove('screen--entering');
    }
    container.scrollTop = 0;
  }

  /**
   * Warms a lazy screen up in the background, so the wait never lands on the player.
   * @param {string} name
   */
  function preload(name) {
    if (loaded.has(name)) return;
    resolve(name).catch(() => {
      // A failed preload is not an error: the screen simply loads when it is needed.
    });
  }

  /** Brings state, hash and rendered screen back in line. */
  function sync() {
    const state = store.getState();
    const allowed = resolveScreen(state.screen, state);
    if (allowed !== state.screen) {
      store.dispatch({ type: 'screen/go', payload: allowed });
      return;
    }
    syncHash(allowed);
    render(allowed);
  }

  /** The browser navigated: adopt the hash, subject to the same guards. */
  function onHashChange() {
    const state = store.getState();
    const wanted = resolveScreen(screenFromHash(), state);
    if (wanted === state.screen) {
      syncHash(wanted);
      return;
    }
    store.dispatch({ type: 'screen/go', payload: wanted });
  }

  return {
    start() {
      const state = store.getState();
      // A hash in the URL wins on load, so a bookmark or a reload lands where it should.
      const wanted = resolveScreen(window.location.hash ? screenFromHash() : state.screen, state);
      if (wanted !== state.screen) store.dispatch({ type: 'screen/go', payload: wanted });

      unsubscribe = store.subscribe(sync);
      window.addEventListener('hashchange', onHashChange);
      sync();
    },

    preload,

    stop() {
      unsubscribe?.();
      window.removeEventListener('hashchange', onHashChange);
      if (transitionTimer !== null) clearTimeout(transitionTimer);
      currentModule?.unmount();
      currentModule = null;
      currentName = null;
    },
  };
}
