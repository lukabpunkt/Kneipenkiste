/**
 * Player screen: add 2-12 players, emoji avatars, validation, pass-the-phone flow.
 *
 * The flow is built for a phone travelling around a table: type a name, press Enter, hand the
 * phone on. Tapping an avatar rolls a new one. Names are validated live rather than on submit,
 * so nobody hits a wall at the footer button.
 */

import { el, listen, focus } from '../dom.js';
import { button, iconButton } from '../components/button.js';
import { page, header, card } from '../components/layout.js';
import { AVATARS, nextAvatar } from '../../data/avatars.js';
import { BETTING } from '../../config.js';

let cleanup = null;

/**
 * Checks a name against the rules from docs/01_GAME_DESIGN.md §3.2.
 * @param {string} name
 * @param {{id: string, name: string}[]} players
 * @param {string|null} ownId id of the player being renamed, if any
 * @returns {string|null} error message, or null when the name is fine
 */
export function validateName(name, players, ownId = null) {
  const trimmed = name.trim();
  if (trimmed === '') return 'Der Name darf nicht leer sein.';
  if (trimmed.length > BETTING.maxNameLength) {
    return `Höchstens ${BETTING.maxNameLength} Zeichen.`;
  }
  const taken = players.some(
    (player) => player.id !== ownId && player.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return taken ? 'Den Namen gibt es schon.' : null;
}

/**
 * @param {HTMLElement} container
 * @param {{getState: Function, dispatch: Function, subscribe: Function}} store
 */
export function mount(container, store) {
  const list = el('ul', { className: 'player-list' });
  const error = el('p', { className: 'field__error', attrs: { role: 'alert' } });

  const input = el('input', {
    className: 'input',
    attrs: {
      type: 'text',
      id: 'new-player',
      maxlength: String(BETTING.maxNameLength),
      placeholder: 'Name eintippen …',
      autocomplete: 'off',
      autocapitalize: 'words',
      enterkeyhint: 'done',
      'aria-describedby': 'new-player-error',
    },
  });
  error.id = 'new-player-error';

  const hint = el('p', { className: 'hint players__hint' });
  const count = el('span', { className: 'progress-pill num' });
  const addButton = button({
    label: '+ Spieler',
    variant: 'secondary',
    onClick: () => addPlayer(),
  });
  const footerButton = button({ label: 'Weiter zu den Wetten →', wide: true });

  /** Adds the typed name, if it is valid. */
  function addPlayer() {
    const state = store.getState();
    if (state.players.length >= BETTING.maxPlayers) {
      error.textContent = `Mehr als ${BETTING.maxPlayers} Spieler passen nicht an einen Tisch.`;
      return;
    }
    const problem = validateName(input.value, state.players);
    if (problem) {
      error.textContent = problem;
      focus(input);
      return;
    }
    error.textContent = '';
    store.dispatch({ type: 'players/add', payload: { name: input.value } });
    input.value = '';
    focus(input);
  }

  /** One row: avatar button, name field, remove button. */
  function renderRow(player, players) {
    const avatar = el('button', {
      className: 'player-row__avatar',
      text: player.avatar,
      attrs: { type: 'button', 'aria-label': `Avatar von ${player.name} wechseln` },
      on: {
        click: () =>
          store.dispatch({
            type: 'players/setAvatar',
            payload: {
              id: player.id,
              avatar: nextAvatar(
                players.map((other) => other.avatar),
                AVATARS.indexOf(player.avatar) + 1,
              ),
            },
          }),
      },
    });

    const name = el('input', {
      className: 'input player-row__name',
      attrs: {
        type: 'text',
        value: player.name,
        maxlength: String(BETTING.maxNameLength),
        'aria-label': 'Name',
      },
      on: {
        change: (event) => {
          const problem = validateName(event.target.value, store.getState().players, player.id);
          if (problem) {
            error.textContent = problem;
            event.target.value = player.name;
            return;
          }
          error.textContent = '';
          store.dispatch({
            type: 'players/rename',
            payload: { id: player.id, name: event.target.value },
          });
        },
      },
    });
    name.value = player.name;

    return el('li', { className: 'player-row' }, [
      avatar,
      name,
      iconButton({
        icon: 'remove',
        label: `${player.name} entfernen`,
        onClick: () => store.dispatch({ type: 'players/remove', payload: { id: player.id } }),
      }),
    ]);
  }

  /** Redraws the list and the footer state. */
  function render() {
    const { players } = store.getState();
    list.replaceChildren(...players.map((player) => renderRow(player, players)));

    const enough = players.length >= BETTING.minPlayers;
    footerButton.disabled = !enough;
    footerButton.title = enough ? '' : `Ihr braucht mindestens ${BETTING.minPlayers} Spieler.`;
    addButton.disabled = players.length >= BETTING.maxPlayers;
    // The count belongs in the header where the betting screen keeps its own; the line under the
    // roster is for the one thing that changes what you do next.
    count.textContent = `${players.length} / ${BETTING.maxPlayers}`;
    hint.textContent = enough
      ? 'Reicht. Ihr könnt jederzeit noch jemanden dazunehmen.'
      : `Noch ${BETTING.minPlayers - players.length} ${
          BETTING.minPlayers - players.length === 1 ? 'Spieler' : 'Spieler'
        }, dann kann es losgehen.`;
  }

  footerButton.addEventListener('click', () => {
    if (footerButton.disabled) return;
    store.dispatch({ type: 'bets/reset' });
    store.dispatch({ type: 'screen/go', payload: 'betting' });
  });

  const unlisten = listen([
    [
      input,
      'keydown',
      (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        addPlayer();
      },
    ],
  ]);

  container.append(
    page({
      header: header({
        title: 'Wer spielt mit?',
        subtitle: 'Reicht das Gerät herum – jeder tippt seinen Namen ein.',
        aside: count,
      }),
      // One panel, not a list floating above a form. The roster and the way to grow it are the
      // same thing, so they live in the same box.
      body: [
        card(
          [
            list,
            el('div', { className: 'field players__add' }, [
              el('label', {
                className: 'visually-hidden',
                text: 'Neuer Spieler',
                attrs: { for: 'new-player' },
              }),
              el('div', { className: 'field__row' }, [input, addButton]),
              error,
            ]),
          ],
          'card--roster',
        ),
        hint,
      ],
      footer: footerButton,
    }),
  );

  const unsubscribe = store.subscribe(render);
  render();
  cleanup = () => {
    unlisten();
    unsubscribe();
  };
}

export function unmount() {
  cleanup?.();
  cleanup = null;
}
