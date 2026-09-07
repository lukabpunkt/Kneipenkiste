/**
 * The choosing half of a betting round: the six horses and the stake panel under them.
 *
 * The counterpart to bettingSummary.js, which says of itself that the grid is "a different job —
 * that one is about choosing, these are about seeing what has been chosen". This is that job.
 *
 * Both parts work on a *draft* bet the screen owns: an object the panel writes the stake into
 * directly, because the stepper has its own value and re-rendering on every step would throw the
 * keyboard out of it. Nothing here touches the store; what a tap means is decided by the screen.
 */

import { el } from './dom.js';
import { button } from './components/button.js';
import { stepper } from './components/stepper.js';
import { card, horsePortrait } from './components/layout.js';
import { HORSES, HORSES_BY_ID } from '../data/horses.js';
import { BETTING } from '../config.js';
import { sips, BET_TYPE_LABELS, betTypeHint } from './strings.js';

/**
 * The six horses, with whoever is already on each of them.
 * @param {any} state
 * @param {object|null} draft the bet being composed, for the selected state
 * @param {(horse: object) => void} onPick
 * @returns {HTMLElement}
 */
export function horseGrid(state, draft, onPick) {
  return el(
    'div',
    { className: 'horse-grid' },
    HORSES.map((horse) => horseCard(state, horse, draft?.horseId === horse.id, onPick)),
  );
}

/**
 * One horse to choose.
 * @param {any} state
 * @param {object} horse
 * @param {boolean} selected
 * @param {(horse: object) => void} onPick
 * @returns {HTMLElement}
 */
function horseCard(state, horse, selected, onPick) {
  const backers = state.bets
    .filter((bet) => bet.horseId === horse.id)
    .map((bet) => state.players.find((player) => player.id === bet.playerId))
    .filter(Boolean);

  return el(
    'button',
    {
      className: `horse-card${selected ? ' horse-card--selected' : ''}`,
      vars: {
        '--horse-color': horse.color,
        '--horse-light': horse.colorLight,
        '--horse-dark': horse.colorDark,
      },
      attrs: {
        type: 'button',
        'aria-pressed': selected ? 'true' : 'false',
        // The stable handle a redraw uses to give the keyboard its place back.
        'data-horse': horse.id,
      },
      on: { click: () => onPick(horse) },
    },
    [
      horsePortrait(horse, 68),
      el('span', { className: 'horse-card__name', text: horse.name }),
      el('span', { className: 'horse-card__character', text: horse.character }),
      backers.length > 0
        ? el(
            'span',
            { className: 'horse-card__backers' },
            backers.map((player) =>
              el('span', {
                className: 'horse-card__backer',
                text: player.avatar,
                attrs: { title: player.name },
              }),
            ),
          )
        : null,
    ],
  );
}

/**
 * The panel that appears once a horse is picked: how much, what kind of bet, and the confirm.
 *
 * Returns a handle rather than an element because the stepper holds a pointer-capture timer that
 * has to be released when the panel is replaced.
 *
 * @param {any} state
 * @param {object} draft mutated in place as the stake changes
 * @param {{onType: (value: string) => void, onConfirm: () => void}} actions
 * @returns {{node: HTMLElement, destroy: () => void}}
 */
export function createStakePanel(state, draft, { onType, onConfirm }) {
  const horse = HORSES_BY_ID[draft.horseId];
  const settings = state.settings;

  const stake = stepper({
    value: draft.sips,
    min: BETTING.minSips,
    max: BETTING.maxSips,
    label: 'Einsatz',
    format: (value) => sips(settings, value),
    onChange: (value) => {
      draft.sips = value;
    },
  });

  const node = card(
    [
      el('p', { className: 'stake__horse' }, [
        el('span', { className: 'stake__horse-name', text: horse.name }),
        el('span', { className: 'stake__horse-dot', vars: { '--horse-color': horse.color } }),
      ]),
      stake.node,
      typeChooser(settings, draft, onType),
      button({ label: 'Setzen ✓', wide: true, onClick: onConfirm }),
    ],
    'card--stake',
  );

  return { node, destroy: () => stake.destroy() };
}

/**
 * Win, place or last — but only when the table left the choice to each player.
 * @param {any} settings
 * @param {object} draft
 * @param {(value: string) => void} onType
 * @returns {HTMLElement}
 */
function typeChooser(settings, draft, onType) {
  if (settings.betType !== 'free') {
    return el('p', { className: 'hint', text: betTypeHint(settings.betType) });
  }

  return el('div', { className: 'bet-types' }, [
    el('span', { className: 'bet-types__label', text: 'Wettart' }),
    el(
      'div',
      { className: 'bet-types__row' },
      Object.entries(BET_TYPE_LABELS).map(([value, label]) =>
        el('button', {
          className: `chip${draft.type === value ? ' chip--active' : ''}`,
          text: label,
          attrs: { type: 'button', 'aria-pressed': draft.type === value ? 'true' : 'false' },
          on: { click: () => onType(value) },
        }),
      ),
    ),
    el('p', { className: 'hint', text: betTypeHint(draft.type) }),
  ]);
}
