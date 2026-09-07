/**
 * The list views of a betting round: the summary of who is on what, and the card that offers the
 * last race's bets back.
 *
 * Split out of the betting screen because they are a different job from the horse grid — that one
 * is about choosing, these are about seeing what has been chosen. They are pure: state in,
 * elements out, with the two things a line can do handed in as callbacks.
 */

import { el } from './dom.js';
import { button } from './components/button.js';
import { card, horseBadge, playerChip } from './components/layout.js';
import { HORSES_BY_ID } from '../data/horses.js';
import { BETTING } from '../config.js';
import { BET_TYPE_LABELS, sips, sipWord } from './strings.js';

/** The bet a player currently holds, if any. */
const betOf = (state, playerId) => state.bets.find((bet) => bet.playerId === playerId) ?? null;

/** Bets from the last race that still belong to somebody at the table. */
export const restorableBets = (state) =>
  state.lastBets.filter((bet) => state.players.some((player) => player.id === bet.playerId));

/**
 * The two buttons that move a stake by one, right in the line.
 *
 * Changing only the stake is the commonest thing a table does between races — the horse stays,
 * the stake goes up when it gets exciting. Sending them through the horse grid for that meant
 * scrolling past all six horses to reach the stepper below it.
 *
 * They wear the stepper's own button, so it stays the same control the stake panel uses; what
 * they leave out is hold-to-repeat. One tap is one sip here on purpose: nobody wants to find
 * themselves on ten because they rested a thumb, and the list is rebuilt after every dispatch,
 * which a hold would not survive anyway.
 *
 * @param {any} state
 * @param {object} player
 * @param {object} bet
 * @param {(player: object, delta: number) => void} onStake
 * @returns {HTMLElement}
 */
function stakeNudge(state, player, bet, onStake) {
  const one = sipWord(state.settings, 1);
  const now = sips(state.settings, bet.sips);

  /**
   * @param {number} delta
   * @param {string} sign
   * @param {string} direction
   * @param {string} wording
   * @param {boolean} atEnd
   * @returns {HTMLElement}
   */
  const nudge = (delta, sign, direction, wording, atEnd) =>
    el('button', {
      className: 'stepper__btn overview__nudge',
      text: sign,
      attrs: {
        type: 'button',
        disabled: atEnd || null,
        // The stable handle the screen uses to hand the focus back after the redraw.
        'data-stake': `${player.id}:${direction}`,
        // The value comes along, because the focus lands here again after the list is rebuilt and
        // that is the moment a screen reader reads the button out. Without it the change would be
        // silent: the number beside it is a new node, so a live region on it would not fire.
        'aria-label': `Ein ${one} ${wording} für ${player.name}, jetzt ${now}`,
      },
      on: { click: () => onStake(player, delta) },
    });

  return el('div', { className: 'overview__stake' }, [
    nudge(-1, '−', 'down', 'weniger', bet.sips <= BETTING.minSips),
    el('span', {
      className: 'overview__sips num',
      text: now,
      // Both buttons already say it; three times over is noise.
      attrs: { 'aria-hidden': 'true' },
    }),
    nudge(1, '+', 'up', 'mehr', bet.sips >= BETTING.maxSips),
  ]);
}

/**
 * One line of the table: who, on what, for how much.
 *
 * Shared by the summary and the "run it back" card so the two cannot drift apart. In the summary
 * the line holds two controls side by side: the left half picks the horse, the right half moves
 * the stake. The line itself cannot be the button any more — a button inside a button is invalid
 * markup, and the browser does not deliver the inner clicks.
 *
 * @param {any} state
 * @param {object} player
 * @param {{onEdit?: (player: object) => void, onStake?: Function}} [options]
 * @returns {HTMLElement}
 */
function betRow(state, player, { onEdit, onStake } = {}) {
  const bet = betOf(state, player.id);
  const horse = bet ? HORSES_BY_ID[bet.horseId] : null;

  const detail = horse
    ? el('span', { className: 'overview__horse' }, [
        horseBadge(horse, 'sm'),
        el('span', { text: horse.name }),
        // Only worth showing when the players could actually choose differently.
        state.settings.betType === 'free'
          ? el('span', {
              className: 'overview__type',
              text: BET_TYPE_LABELS[bet.type ?? 'win'],
            })
          : null,
      ])
    : el('span', { className: 'overview__horse overview__horse--open', text: 'noch offen' });

  const amount = el('span', {
    className: 'overview__sips num',
    text: bet ? sips(state.settings, bet.sips) : '–',
  });

  if (!onEdit) {
    return el('li', { className: 'overview__row' }, [playerChip(player), detail, amount]);
  }

  // The stake is no longer part of this button's job, so it is no longer part of its name.
  const label = bet
    ? `Pferd von ${player.name} ändern: ${horse.name}`
    : `Wette für ${player.name} setzen`;

  const pick = el(
    'button',
    {
      className: 'overview__pick',
      attrs: { type: 'button', 'aria-label': label },
      on: { click: () => onEdit(player) },
    },
    [
      playerChip(player),
      detail,
      el('span', {
        className: 'overview__edit',
        text: bet ? 'ändern' : 'setzen',
        attrs: { 'aria-hidden': 'true' },
      }),
    ],
  );

  return el(
    'li',
    { className: `overview__row overview__row--action${bet ? '' : ' overview__row--open'}` },
    // Nothing to nudge until there is a bet, and no dash either: "noch offen" has already said it.
    [pick, bet && onStake ? stakeNudge(state, player, bet, onStake) : null],
  );
}

/**
 * The card offered at the start of a round: the same bets as last time, or start over.
 * @param {any} state
 * @param {{onRepeat: () => void, onFresh: () => void}} actions
 * @returns {HTMLElement}
 */
export function carrySummary(state, { onRepeat, onFresh }) {
  const players = restorableBets(state)
    .map((bet) => state.players.find((player) => player.id === bet.playerId))
    .filter(Boolean);

  return card(
    [
      el('h2', { className: 'overview__title', text: 'Beim letzten Rennen habt ihr so gesetzt' }),
      el(
        'ul',
        { className: 'overview__list' },
        players.map((player) => betRow(lastRoundState(state), player)),
      ),
      button({ label: 'Wetten übernehmen', wide: true, onClick: onRepeat }),
      button({ label: 'Alle neu setzen', variant: 'ghost', onClick: onFresh }),
    ],
    'card--carry',
  );
}

/**
 * The state as the card wants to read it: the remembered bets standing in for the current ones,
 * so `betRow` can be used unchanged.
 * @param {any} state
 * @returns {any}
 */
const lastRoundState = (state) => ({ ...state, bets: state.lastBets });

/**
 * The table of who is on what. Every line is a way into that player's bet — that is how somebody
 * changes their mind without the whole table setting again.
 * @param {any} state
 * @param {{onEdit: Function, onStake: Function, onReset: () => void}} actions
 * @returns {HTMLElement}
 */
export function betSummary(state, { onEdit, onStake, onReset }) {
  return card(
    [
      el('h2', {
        className: 'overview__title',
        text:
          state.bets.length === state.players.length ? 'Alle haben gesetzt' : 'Wer setzt worauf',
      }),
      el(
        'ul',
        { className: 'overview__list' },
        // Every player, not only those with a bet: somebody who joined since the last race
        // belongs here too, and tapping their line is how they place one.
        state.players.map((player) => betRow(state, player, { onEdit, onStake })),
      ),
      button({ label: 'Wetten zurücksetzen', variant: 'ghost', onClick: onReset }),
    ],
    'card--overview',
  );
}
