/**
 * Statistics screen: sips per player, wins and losing streaks of the running session.
 *
 * Purely informational and deliberately without any "hot streak" reading — a horse that won
 * three times in a row is not more likely to win the fourth, and the UI must never suggest
 * otherwise (docs/01_GAME_DESIGN.md §5, item 14/15).
 */

import { el } from '../dom.js';
import { historyStrip } from '../components/history.js';
import { modal } from '../components/modal.js';
import { button } from '../components/button.js';
import { sipWord } from '../strings.js';

/**
 * One headline figure with its label under it.
 * @param {string} value
 * @param {string} label
 * @param {string} [avatar]
 * @returns {HTMLElement}
 */
function tile(value, label, avatar) {
  return el('li', { className: 'stat-tile' }, [
    avatar
      ? el('span', {
          className: 'stat-tile__avatar',
          text: avatar,
          attrs: { 'aria-hidden': 'true' },
        })
      : null,
    el('span', { className: 'stat-tile__value num', text: value }),
    el('span', { className: 'stat-tile__label', text: label }),
  ]);
}

/**
 * The three figures worth saying out loud, above the table that has all of them.
 *
 * Deliberately no "in form" or "hot streak" reading anywhere: a horse that won three times is no
 * likelier to win the fourth, and the interface must never imply otherwise
 * (docs/01_GAME_DESIGN.md §5).
 *
 * @param {any} state
 * @param {{player: any, stats: any}[]} rows already sorted, best first
 * @returns {HTMLElement}
 */
function highlights(state, rows) {
  const races = state.session.racesPlayed;
  const best = rows[0];
  const thirstiest = [...rows].sort((a, b) => b.stats.drank - a.stats.drank)[0];

  return el(
    'ul',
    { className: 'stat-tiles' },
    [
      tile(String(races), races === 1 ? 'Rennen' : 'Rennen gelaufen'),
      best && best.stats.wins > 0
        ? tile(`${best.stats.wins}×`, `${best.player.name} vorn`, best.player.avatar)
        : null,
      thirstiest && thirstiest.stats.drank > 0
        ? tile(
            String(thirstiest.stats.drank),
            // The unit lives in the label: a value that can wrap to two lines makes one tile
            // twice the height of its neighbours.
            `${sipWord(state.settings, thirstiest.stats.drank)} für ${thirstiest.player.name}`,
            thirstiest.player.avatar,
          )
        : null,
    ].filter(Boolean),
  );
}

/**
 * Builds the per-player table.
 * @param {any} state
 * @param {{player: any, stats: any}[]} rows
 * @returns {HTMLElement}
 */
function table(state, rows) {
  const unit = sipWord(state.settings, 2);

  return el('table', { className: 'stats-table' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Spieler', attrs: { scope: 'col' } }),
        el('th', { text: 'Siege', attrs: { scope: 'col' } }),
        el('th', { text: 'verteilt', attrs: { scope: 'col', title: `${unit} verteilt` } }),
        el('th', { text: 'getrunken', attrs: { scope: 'col', title: `${unit} getrunken` } }),
        el('th', { text: 'Pech', attrs: { scope: 'col', title: 'Längste Pechsträhne' } }),
      ]),
    ]),
    el(
      'tbody',
      {},
      rows.map(({ player, stats }, index) =>
        el('tr', { className: index === 0 && stats.wins > 0 ? 'is-leading' : '' }, [
          el('th', { className: 'stats-table__who', attrs: { scope: 'row' } }, [
            el('span', {
              className: 'stats-table__avatar',
              text: player.avatar,
              attrs: { 'aria-hidden': 'true' },
            }),
            el('span', { text: player.name }),
          ]),
          el('td', { className: 'num', text: String(stats.wins) }),
          el('td', { className: 'num', text: String(stats.dealt) }),
          el('td', { className: 'num', text: String(stats.drank) }),
          el('td', { className: 'num', text: String(stats.maxLoseStreak) }),
        ]),
      ),
    ),
  ]);
}

/**
 * Opens the statistics overlay.
 * @param {{getState: Function, dispatch: Function}} store
 * @returns {{close: () => void}}
 */
export function openStats(store) {
  const content = el('div', { className: 'stats' });

  function render() {
    const state = store.getState();
    const rows = state.players
      .map((player) => ({ player, stats: state.session.perPlayer[player.id] }))
      .filter((row) => row.stats)
      .sort((a, b) => b.stats.wins - a.stats.wins || a.stats.drank - b.stats.drank);

    if (rows.length === 0) {
      content.replaceChildren(el('p', { className: 'hint', text: 'Noch kein Rennen gelaufen.' }));
      return;
    }

    content.replaceChildren(
      highlights(state, rows),
      el('h3', { text: 'Wer wie steht' }),
      table(state, rows),
      historyStrip(state) ?? el('span'),
      button({
        label: 'Session zurücksetzen',
        variant: 'ghost',
        onClick: () => {
          store.dispatch({ type: 'session/reset' });
          render();
        },
      }),
    );
  }

  render();
  return modal({ title: 'Statistik', content });
}
