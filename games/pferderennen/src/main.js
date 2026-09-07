/**
 * Entry point of the game.
 *
 * Loads the persisted state, creates the store, starts persisting and hands over to the router.
 * Everything that follows is driven by state changes — no screen ever calls another directly.
 */

import { createStore } from './state/store.js';
import { rootReducer, createInitialState } from './state/reducers.js';
import { loadState, persist, isPersistenceAvailable } from './state/persistence.js';
import { createRouter } from './ui/router.js';
import { toast } from './ui/components/toast.js';
import { setMuted, unlock } from './audio/audio.js';
import { uiTap } from './audio/sfx.js';
import * as start from './ui/screens/start.js';
import * as players from './ui/screens/players.js';
import * as betting from './ui/screens/betting.js';
import * as results from './ui/screens/results.js';

/**
 * The race screen is loaded on demand.
 *
 * It pulls in the whole renderer — the horses, both tracks, the event props, the particles —
 * which is by far the largest part of the code and which nobody needs before they have placed a
 * bet. Loading it lazily keeps the first paint small (docs/02_ARCHITECTURE.md §8).
 */
const screens = {
  start,
  players,
  betting,
  race: () => import('./ui/screens/race.js'),
  results,
};

const restored = loadState();
const store = createStore(rootReducer, restored?.state ?? createInitialState());

persist(store);

// A reload during a race loses the race; the bets survive (docs/02_ARCHITECTURE.md §9).
// The URL still says #/race, so rewrite it before the router can act on it.
if (restored?.raceWasAborted) {
  history.replaceState(null, '', `#/${store.getState().screen}`);
}

const app = document.getElementById('app');
if (app) {
  const router = createRouter({ store, container: app, screens });
  router.start();
  // Fetch the renderer in the background while the players are still typing their names, so the
  // lazy load never becomes a wait anybody notices.
  const warm = () => router.preload('race');
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 1500);
}

if (restored?.raceWasAborted) {
  toast('Rennen wurde abgebrochen – startet es einfach nochmal.', {
    icon: '🏁',
    variant: 'warning',
  });
}

/**
 * The reduced-motion override.
 *
 * The CSS block for `prefers-reduced-motion` follows the system, which is the right default; the
 * setting can force it either way. A data attribute on the root is all the stylesheet needs.
 */
function applyMotion() {
  const value = store.getState().settings.reducedMotion;
  if (value === 'auto') delete document.documentElement.dataset.motion;
  else document.documentElement.dataset.motion = value === 'on' ? 'reduced' : 'full';
}
applyMotion();
store.subscribe(applyMotion);

/**
 * Sound.
 *
 * Browsers refuse to start an AudioContext before the user has touched the page, so the context
 * is built inside the first pointer or key event and never before. Every later tap gets the
 * click cue; `uiTap()` is a no-op while sound is off, so there is nothing to unsubscribe.
 */
setMuted(!store.getState().settings.sound);

let unlocked = false;
const onGesture = () => {
  if (!unlocked) {
    unlocked = unlock();
    setMuted(!store.getState().settings.sound);
    return;
  }
  uiTap();
};
document.addEventListener('pointerdown', onGesture);
document.addEventListener('keydown', onGesture);

// The sound setting can change at any time; the master gain follows it.
let soundWas = store.getState().settings.sound;
store.subscribe(() => {
  const now = store.getState().settings.sound;
  if (now === soundWas) return;
  soundWas = now;
  setMuted(!now);
  if (now) unlock();
});

/**
 * The service worker.
 *
 * It is what makes the game work in flight mode, which is the whole point of a drinking game on
 * a phone in a kitchen with bad reception. Registration is skipped under the dev server, where a
 * cache-first worker would fight hot reloading for every file.
 */
if ('serviceWorker' in navigator && !import.meta.env?.DEV) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      registration.addEventListener('updatefound', () => {
        const incoming = registration.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', () => {
          // A worker that reaches "installed" while another one controls the page is an update,
          // not a first install. Nothing is swapped underneath the player mid-race; they decide.
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Neue Version – neu laden.', { icon: '✨', duration: 8000 });
          }
        });
      });
    } catch {
      // No worker means no offline mode. The game itself is unaffected.
    }
  });
}

if (!isPersistenceAvailable()) {
  toast('Ohne Speicher: Namen und Einstellungen sind nach dem Neuladen weg.', {
    variant: 'warning',
  });
}
