/**
 * Start screen: the title, and one obvious way in.
 *
 * This is a title screen, not a content screen, so it does not stack from the top like the rest
 * of the game — the brand sits in the optical centre with the horses idling behind it, and the
 * one action that matters waits at the bottom where a thumb already is. Everything else is
 * utility and reads as utility.
 *
 * When players are already stored the primary action becomes "Weiterspielen", so a second
 * evening starts without typing a single name again.
 */

import { el } from '../dom.js';
import { historyStrip } from '../components/history.js';
import { button } from '../components/button.js';
import { page } from '../components/layout.js';
import { openRules } from './rules.js';
import { openSettings } from './settings.js';
import { openStats } from './stats.js';

let cleanup = null;

/**
 * True when the player has asked for less motion, either in the settings or in the system.
 * @param {any} settings
 * @returns {boolean}
 */
function prefersCalm(settings) {
  if (settings.reducedMotion === 'on') return true;
  if (settings.reducedMotion === 'off') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * @param {HTMLElement} container
 * @param {{getState: Function, dispatch: Function}} store
 */
export function mount(container, store) {
  const state = store.getState();
  const players = state.players;
  const hasPlayers = players.length > 0;

  const go = (screen) => store.dispatch({ type: 'screen/go', payload: screen });

  const title = el('div', { className: 'start__brand' }, [
    el('h1', { className: 'start__title', text: 'Pferderennen' }),
    el('p', { className: 'start__tagline', text: 'Sechs Pferde. Ein Gerät. Viel Blödsinn.' }),
  ]);

  /*
   * Who played last time and how the last races went, as one quiet strip. It used to be a full
   * card with a label, a rule and a row of dots under it, which gave a line of small print the
   * same weight as the thing you came here to press.
   */
  const roster = hasPlayers
    ? el('div', { className: 'start__last' }, [
        el(
          'ul',
          {
            className: 'start__roster',
            attrs: { 'aria-label': `Zuletzt gespielt mit ${players.length} Spielern` },
          },
          players.map((player) =>
            el('li', { className: 'start__roster-item', attrs: { title: player.name } }, [
              el('span', {
                className: 'start__roster-avatar',
                text: player.avatar,
                attrs: { 'aria-hidden': 'true' },
              }),
              el('span', { className: 'start__roster-name', text: player.name }),
            ]),
          ),
        ),
        historyStrip(state, { compact: true }),
      ])
    : null;

  const primary = hasPlayers
    ? button({
        label: 'Weiterspielen',
        wide: true,
        onClick: () => {
          store.dispatch({ type: 'bets/reset' });
          store.dispatch({ type: 'race/clear' });
          go('betting');
        },
      })
    : button({ label: "Los geht's", wide: true, onClick: () => go('players') });

  /*
   * The three utilities. They are deliberately the quietest thing on the screen: nobody opens a
   * party game to read the settings. Icons carry them so they stay legible while staying small.
   */
  const utilities = el(
    'div',
    { className: 'start__utilities' },
    [
      { label: 'Regeln', name: 'rules', open: () => openRules(store) },
      { label: 'Einstellungen', name: 'settings', open: () => openSettings(store) },
      state.session.racesPlayed > 0
        ? { label: 'Statistik', name: 'stats', open: () => openStats(store) }
        : null,
    ]
      .filter(Boolean)
      .map((item) =>
        button({ label: item.label, icon: item.name, variant: 'ghost', onClick: item.open }),
      ),
  );

  // Changing the roster belongs to "Weiterspielen", not to the utilities, so it sits under it.
  const changePlayers = hasPlayers
    ? button({ label: 'Spieler ändern', variant: 'ghost', onClick: () => go('players') })
    : null;

  // The attract mode: the six horses idling on the track behind the title. It is loaded on
  // demand for the same reason the race is — it *is* the race renderer, and pulling it in here
  // eagerly would undo the small first paint. Loading it here also warms it up for the race.
  const stage = el('canvas', { className: 'attract', attrs: { 'aria-hidden': 'true' } });
  let attract = null;
  let dropped = false;

  /**
   * Loaded and started only once the browser has nothing better to do. The horses are the last
   * thing that matters on this screen; letting them compete with the first paint cost 1.8 s of
   * blocked main thread on a throttled phone (audit A5).
   */
  const startIdling = () => {
    import('../../render/attract.js')
      .then(({ startAttract }) => {
        if (dropped) return;
        attract = startAttract(stage, { calm: prefersCalm(state.settings) });
        stage.classList.add('attract--ready');
      })
      .catch(() => {
        // No attract mode is a missing flourish, not a broken screen.
      });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(startIdling, { timeout: 2000 });
  else setTimeout(startIdling, 300);

  container.append(
    stage,
    page({
      body: [title, roster, utilities].filter(Boolean),
      footer: el('div', { className: 'start__footer' }, [primary, changePlayers].filter(Boolean)),
    }),
  );

  cleanup = () => {
    dropped = true;
    attract?.stop();
  };
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}
