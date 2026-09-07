/**
 * Result screen: podium, who deals, who drinks, house win, event recap.
 *
 * The one question this screen must answer in under three seconds is "who drinks how much"
 * (audit A1), so the payout cards come before everything else that is merely nice to look at.
 */

import { el } from '../dom.js';
import { button } from '../components/button.js';
import { page, header, card, playerChip } from '../components/layout.js';
import { HORSES_BY_ID } from '../../data/horses.js';
import { settle } from '../../engine/payout.js';
import { sips, BET_TYPE_LABELS } from '../strings.js';
import { icon } from '../components/icon.js';
import { openStats } from './stats.js';

let cleanup = null;

/** Left to right under the scene: second, first, third, matching where they stand. */
const CAPTION_ORDER = [1, 0, 2];

/**
 * Is reduced motion in force? Same rule as the start screen and the race.
 * @param {{reducedMotion?: string}} settings
 * @returns {boolean}
 */
function prefersCalm(settings) {
  if (settings.reducedMotion === 'on') return true;
  if (settings.reducedMotion === 'off') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * The prize giving: a canvas scene with the three names written out underneath it.
 *
 * The names stay real text on purpose. They are what a screen reader reads and what anyone
 * glancing at the screen actually needs — the scene is the celebration, not the information
 * (audit A4).
 *
 * @param {string[]} order finishing order, as horse ids
 * @param {any} settings
 * @returns {{node: HTMLElement, start: () => void, stop: () => void}}
 */
function ceremony(order, settings) {
  const podiumHorses = [0, 1, 2].map((place) => HORSES_BY_ID[order[place]]).filter(Boolean);

  const stage = el('canvas', {
    className: 'ceremony__stage',
    attrs: {
      role: 'img',
      'aria-label': podiumHorses.length
        ? `Siegerehrung. ${podiumHorses.map((horse, i) => `${i + 1}. ${horse.name}`).join(', ')}.`
        : 'Siegerehrung',
    },
  });

  const captions = el(
    'ol',
    { className: 'ceremony__names' },
    CAPTION_ORDER.map((place) => {
      const horse = HORSES_BY_ID[order[place]];
      if (!horse) return null;
      return el(
        'li',
        {
          className: `ceremony__name ceremony__name--${place + 1}`,
          vars: { '--horse-color': horse.color, '--horse-dark': horse.colorDark },
        },
        [
          el('span', { className: 'ceremony__place num', text: `${place + 1}.` }),
          el('span', { className: 'ceremony__horse', text: horse.name }),
        ],
      );
    }).filter(Boolean),
  );

  const node = el('div', { className: 'ceremony' }, [stage, captions]);
  let scene = null;
  let dropped = false;

  return {
    node,

    /**
     * Loads and runs the scene.
     *
     * Loaded on demand because this screen is imported eagerly: pulling the horse renderer into
     * it directly would drag the whole drawing layer into the first paint, which is exactly the
     * budget M5 had to claw back.
     */
    start() {
      if (podiumHorses.length < 3) return;
      import('../../render/ceremony.js')
        .then(({ startCeremony }) => {
          if (dropped) return;
          scene = startCeremony(stage, {
            horses: podiumHorses,
            calm: prefersCalm(settings),
          });
        })
        .catch(() => {
          // No ceremony is a missing flourish; the names below it still say who won.
        });
    },

    stop() {
      dropped = true;
      scene?.stop();
    },
  };
}

/**
 * One payout card.
 * @param {object} options
 * @param {{avatar: string, name: string}} options.player
 * @param {string} options.text
 * @param {'deal'|'drink'} options.kind
 * @param {string} options.horseName
 * @param {string} [options.betType] shown only when everyone could pick their own
 * @returns {HTMLElement}
 */
function payoutCard({ player, text, kind, horseName, betType }) {
  return el('li', { className: `payout payout--${kind}` }, [
    el('span', { className: 'payout__icon' }, [icon(kind === 'deal' ? 'winner' : 'drink')]),
    el('span', { className: 'payout__body' }, [
      playerChip(player),
      el('span', { className: 'payout__text', text }),
    ]),
    el('span', { className: 'payout__horse' }, [
      el('span', { text: horseName }),
      betType ? el('span', { className: 'payout__type', text: betType }) : null,
    ]),
  ]);
}

/**
 * @param {HTMLElement} container
 * @param {{getState: Function, dispatch: Function}} store
 */
export function mount(container, store) {
  const state = store.getState();
  const order = state.race.result?.order ?? [];
  const settlement = settle({
    bets: state.bets,
    order,
    settings: state.settings,
    events: state.race.result?.events ?? [],
  });

  const winnerHorse = HORSES_BY_ID[order[0]];
  const playerById = (id) => state.players.find((player) => player.id === id);
  const horseName = (id) => HORSES_BY_ID[id]?.name ?? '—';

  const freeChoice = state.settings.betType === 'free';

  const cards = el('ul', { className: 'payouts' }, [
    ...settlement.winners.map((winner) =>
      payoutCard({
        player: playerById(winner.playerId),
        text: `verteilt ${sips(state.settings, winner.sipsToDeal)}`,
        kind: 'deal',
        horseName: horseName(winner.horseId),
        betType: freeChoice ? BET_TYPE_LABELS[winner.type] : null,
      }),
    ),
    ...settlement.losers.map((loser) =>
      payoutCard({
        player: playerById(loser.playerId),
        text: `trinkt ${sips(state.settings, loser.sipsToDrink)}`,
        kind: 'drink',
        horseName: horseName(loser.horseId),
        betType: freeChoice ? BET_TYPE_LABELS[loser.type] : null,
      }),
    ),
  ]);

  // What was already drunk during the race: nobody has to remember it, but seeing it listed
  // settles the "wait, did I drink that one?" arguments.
  const ceremonyStage = ceremony(order, state.settings);

  const live = state.race.result?.rules ?? [];
  // The same rule can fire several times in one race — three lead changes read better as
  // "3x Führungswechsel" than as the same sentence three times.
  const counted = live.reduce((map, text) => map.set(text, (map.get(text) ?? 0) + 1), new Map());
  const recap =
    counted.size > 0
      ? card(
          [
            el('h3', { className: 'recap__title', text: 'Während des Rennens' }),
            el(
              'ul',
              { className: 'recap__list' },
              [...counted].map(([text, count]) =>
                el('li', { text: count > 1 ? `${count}× ${text}` : text }),
              ),
            ),
          ],
          'card--recap',
        )
      : null;

  const houseCard = settlement.houseWins
    ? card(
        [
          el('span', { className: 'house__icon' }, [icon('house', { size: 32 })]),
          el('p', {
            className: 'house__text',
            text: 'Das Haus gewinnt – niemand hatte das Siegerpferd. Alle trinken ihren Einsatz!',
          }),
        ],
        'card--house',
      )
    : null;

  container.append(
    page({
      header: header({
        title: winnerHorse ? `${winnerHorse.name} gewinnt!` : 'Ergebnis',
        subtitle: winnerHorse ? 'Und jetzt wird abgerechnet.' : undefined,
      }),
      body: [ceremonyStage.node, houseCard, cards, recap].filter(Boolean),
      footer: el('div', { className: 'results__actions' }, [
        button({
          label: 'Nächstes Rennen',
          wide: true,
          onClick: () => {
            store.dispatch({ type: 'bets/reset' });
            store.dispatch({ type: 'race/clear' });
            store.dispatch({ type: 'screen/go', payload: 'betting' });
          },
        }),
        el('div', { className: 'results__secondary' }, [
          button({
            label: 'Spieler ändern',
            variant: 'ghost',
            onClick: () => store.dispatch({ type: 'screen/go', payload: 'players' }),
          }),
          button({ label: 'Statistik', variant: 'ghost', onClick: () => openStats(store) }),
        ]),
      ]),
    }),
  );

  // Record the race exactly once. Coming back to this screen must not book it again.
  if (order.length > 0 && !state.race.recorded) {
    store.dispatch({
      type: 'session/record',
      payload: {
        settlement,
        winnerHorseId: order[0],
        seed: state.race.seed,
        timestamp: Date.now(),
      },
    });
    store.dispatch({ type: 'race/markRecorded' });
  }

  ceremonyStage.start();
  cleanup = () => ceremonyStage.stop();
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}
