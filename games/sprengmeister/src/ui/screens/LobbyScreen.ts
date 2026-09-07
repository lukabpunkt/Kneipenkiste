/**
 * Lobby (GDD §5, Screen 1).
 *
 * Spieler 3–8, die automatische Feldgroesse, Modus-Chips mit je einem Satz Erklaerung,
 * Timer-Chips. CTA: "Feld verminen".
 *
 * Die Feldgroesse ist bewusst eine **Anzeige, kein Regler**: Sie folgt der Spielerzahl
 * (GDD §3.2), weil 8 Spieler × 2 Minen auf 5 × 5 unspielbar waeren. Wer sie sieht,
 * versteht, warum die Runde bei sechs Leuten anders aussieht.
 */

import {
  DIG_TIMER_OPTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MODE_IDS,
  PLACE_TIMER_OPTIONS,
  boardSizeFor,
  cellCount,
  loadoutFor,
  type DigTimerSec,
  type ModeId,
  type PlaceTimerSec,
} from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '@/ui/components/button';
import { createPlayerBadge } from '@/ui/components/badge';
import { showToast } from '@/ui/components/toast';
import { openRulesSheet } from '@/ui/screens/RulesSheet';
import { openSettingsSheet } from '@/ui/screens/SettingsSheet';
import type { ScreenFactory } from '@/ui/router';
import { prefersReducedMotion, safeAnimate } from '@/ui/animate';
import { UI_TIMING } from '@/config/theme';

export const createLobbyScreen: ScreenFactory = ({ fsm, session, router }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--lobby';

  const header = document.createElement('header');
  header.className = 'lobby__header';

  const heading = document.createElement('h1');
  heading.className = 'lobby__title';
  heading.textContent = t('lobby.headline');

  const headerActions = document.createElement('div');
  headerActions.className = 'lobby__header-actions';
  headerActions.append(
    createButton({
      label: t('title.rules'),
      variant: 'ghost',
      className: 'btn--compact',
      onClick: () => openRulesSheet(),
    }),
    createButton({
      label: t('title.settings'),
      variant: 'ghost',
      className: 'btn--compact',
      onClick: () => openSettingsSheet({ session, onLocaleChange: () => void router.refresh() }),
    })
  );
  header.append(heading, headerActions);

  const playerList = document.createElement('ul');
  playerList.className = 'lobby__players';

  const fieldInfo = document.createElement('p');
  fieldInfo.className = 'lobby__field';

  const modesSection = document.createElement('section');
  modesSection.className = 'lobby__section';

  const timersSection = document.createElement('section');
  timersSection.className = 'lobby__section';

  const cta = createButton({
    label: t('lobby.cta'),
    variant: 'primary',
    className: 'btn--wide',
    onClick: () => {
      if (!fsm.send({ type: 'mine' })) {
        showToast(t('lobby.tooFewPlayers'), { variant: 'danger' });
        return;
      }
      void router.go('pass');
    },
  });

  /*
   * Wie beim Place-Screen: Der Rumpf scrollt, die primaere Aktion nicht.
   *
   * Die Lobby **muss** scrollen — acht Spielerzeilen und fuenf Modus-Schalter passen auf
   * kein Handy. Aber "Feld verminen" als letztes Kind einer scrollenden Spalte lag bei
   * vier Spielern rund 400 px unter der Falz. Gefunden hat das der Layout-Test, den der
   * Playtest-Befund zum Vergraben-Knopf ausgeloest hat (ADR-28).
   */
  const body = document.createElement('div');
  body.className = 'lobby__body';
  body.append(header, playerList, fieldInfo, modesSection, timersSection);

  const footer = document.createElement('div');
  footer.className = 'lobby__footer';
  footer.append(cta);

  el.append(body, footer);

  /* ---------------------------------------------------------------- */

  /** Nur der erste Aufbau laeuft animiert herein. */
  let playersRendered = false;

  function renderPlayers(): void {
    /*
     * Beim ersten Aufbau laufen die Zeilen versetzt herein — danach nicht mehr. Ein
     * Umbenennen oder ein neuer Spieler zeichnet die Liste neu, und wenn dabei jedes Mal
     * alles wieder einfliegt, wirkt die Lobby unruhig statt lebendig.
     */
    const animate = !playersRendered && !prefersReducedMotion();
    playersRendered = true;
    playerList.replaceChildren();

    session.state.players.forEach((player, index) => {
      const row = document.createElement('li');
      row.className = 'player-row';
      if (animate) {
        void safeAnimate(
          row,
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: UI_TIMING.base,
            delay: index * UI_TIMING.staggerMs,
            easing: 'ease-out',
            fill: 'backwards',
          }
        );
      }

      row.append(createPlayerBadge({ colorId: player.colorId, size: 'md' }));

      const input = document.createElement('input');
      input.className = 'player-row__name';
      input.type = 'text';
      input.value = player.name;
      input.maxLength = 12;
      input.setAttribute('aria-label', t('lobby.namePlaceholder', { index: 1 }));
      input.addEventListener('change', () => session.renamePlayer(player.id, input.value));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'player-row__remove';
      remove.setAttribute('aria-label', t('lobby.removePlayer', { name: player.name }));
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        session.removePlayer(player.id);
        sync();
      });
      // Unter der Mindestzahl gibt es nichts mehr zu entfernen — der Knopf verschwindet
      // nicht, er wird nur stumpf: Die Regel bleibt sichtbar.
      remove.disabled = session.state.players.length <= MIN_PLAYERS;

      row.append(input, remove);
      playerList.append(row);
    });

    if (session.state.players.length < MAX_PLAYERS) {
      const add = document.createElement('li');
      add.append(
        createButton({
          label: t('lobby.addPlayer'),
          variant: 'secondary',
          className: 'btn--wide',
          onClick: () => {
            session.addPlayer((index) => t('lobby.namePlaceholder', { index }));
            sync();
          },
        })
      );
      playerList.append(add);
    }
  }

  function renderField(): void {
    const count = session.state.players.length;
    const size = boardSizeFor(count);
    const loadout = loadoutFor(session.state.settings.modes);
    const mines = count * (loadout.mine + loadout.dud);

    fieldInfo.textContent = `${t('lobby.fieldSize', { size })} — ${t('lobby.fieldSizeHint', {
      count: cellCount(size),
      mines,
    })}`;
  }

  function renderModes(): void {
    modesSection.replaceChildren();

    const label = document.createElement('h2');
    label.className = 'lobby__section-title';
    label.textContent = t('lobby.modes');
    modesSection.append(label);

    for (const id of MODE_IDS) {
      modesSection.append(createModeToggle(id));
    }
  }

  function createModeToggle(id: ModeId): HTMLElement {
    const active = session.state.settings.modes[id];

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'mode-toggle';
    row.dataset['mode'] = id;
    row.setAttribute('role', 'switch');
    row.setAttribute('aria-checked', String(active));
    row.classList.toggle('is-active', active);

    const text = document.createElement('span');
    text.className = 'mode-toggle__text';

    const name = document.createElement('span');
    name.className = 'mode-toggle__name';
    name.textContent = t(`modes.${id}.name`);

    // Ein Satz je Modus, direkt am Schalter: Wer hier waehlt, soll nicht in die Regeln
    // wechseln muessen (Design-Prioritaet 5, Zero Friction).
    const hint = document.createElement('span');
    hint.className = 'mode-toggle__hint';
    hint.textContent = t(`modes.${id}.hint`);

    text.append(name, hint);

    const knob = document.createElement('span');
    knob.className = 'mode-toggle__knob';
    knob.setAttribute('aria-hidden', 'true');

    row.append(text, knob);
    row.addEventListener('click', () => {
      session.setModes({ [id]: !session.state.settings.modes[id] });
      fsm.setSettings(session.state.settings);
      sync();
    });

    return row;
  }

  function renderTimers(): void {
    timersSection.replaceChildren();

    const label = document.createElement('h2');
    label.className = 'lobby__section-title';
    label.textContent = t('lobby.timers');
    timersSection.append(label);

    timersSection.append(
      createTimerRow(
        t('timers.placeLabel'),
        PLACE_TIMER_OPTIONS,
        session.state.settings.placeTimerSec,
        (value) => {
          session.setSettings({ placeTimerSec: value as PlaceTimerSec });
          fsm.setSettings(session.state.settings);
          sync();
        }
      ),
      createTimerRow(
        t('timers.digLabel'),
        DIG_TIMER_OPTIONS,
        session.state.settings.digTimerSec,
        (value) => {
          session.setSettings({ digTimerSec: value as DigTimerSec });
          fsm.setSettings(session.state.settings);
          sync();
        }
      )
    );
  }

  function createTimerRow(
    label: string,
    options: readonly number[],
    current: number,
    onPick: (value: number) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'timer-row';

    const name = document.createElement('span');
    name.className = 'timer-row__label';
    name.textContent = label;
    row.append(name);

    const group = document.createElement('div');
    group.className = 'timer-row__options';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', label);

    for (const value of options) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'chip chip--option';
      option.setAttribute('role', 'radio');
      option.setAttribute('aria-checked', String(value === current));
      option.classList.toggle('is-active', value === current);
      option.textContent = value === 0 ? t('timers.off') : t('timers.seconds', { count: value });
      option.addEventListener('click', () => onPick(value));
      group.append(option);
    }

    row.append(group);
    return row;
  }

  function sync(): void {
    fsm.setPlayers([...session.state.players]);
    renderPlayers();
    renderField();
    renderModes();
    renderTimers();
    cta.disabled = !session.canStart();
  }

  return {
    el,
    activate() {
      session.ensureMinimumPlayers((index) => t('lobby.namePlaceholder', { index }));
      sync();
      /*
       * Board-Chunk und Atlanten laden, waehrend die Spielerliste eingestellt wird
       * (Roadmap M2.6). Bis zur ersten Platte vergehen mehrere Screens — diese Zeit
       * reicht, und der Place-Screen zeigt dann kein Ladefeld mehr.
       *
       * Dynamisch, damit PixiJS nicht im Einstiegs-Chunk landet: Wer nur die Regeln
       * liest, laedt es nie.
       */
      void import('@/game/BoardApp').then(({ preloadBoardAssets }) => preloadBoardAssets());
    },
  };
};
