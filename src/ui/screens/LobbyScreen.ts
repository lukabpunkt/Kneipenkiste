/**
 * Lobby (GDD §5, Screen 1).
 *
 * Spieler 4–8, Modus-Chips mit einem Satz Erklaerung, Verhoer-Dauer, Bedenkzeit — und
 * die Anzeige, wer die erste Runde kontrolliert. Bei weniger als vier Spielern steht
 * dort kein "Fehler", sondern der Satz aus dem GDD.
 */

import { INTERROGATION_PRESETS, MAX_PLAYERS, MIN_PLAYERS, PACK_TIMER_PRESETS } from '@/config/rules';
import type { GameModeId, InterrogationSec, PackTimerSec } from '@/config/rules';
import { GAME_MODES } from '@/config/rules';
import { t } from '@/core/i18n';
import { maxOpenings } from '@/core/modes';
import { preloadStage } from '../stageHost';
import { createBadge } from '../components/badge';
import { ICON_HOME, createButton, createIconButton, symbolSvg } from '../components/button';
import type { ScreenContext, ScreenInstance } from '../router';

export function createLobbyScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('main');
  el.className = 'screen screen--lobby';

  const header = document.createElement('header');
  header.className = 'lobby__header';

  const home = createIconButton({
    icon: ICON_HOME,
    ariaLabel: t('title.play'),
    onClick: () => ctx.fsm.send({ type: 'quit' }),
  });

  const heading = document.createElement('h1');
  heading.className = 'lobby__headline';
  heading.textContent = t('lobby.headline');

  header.append(home, heading);

  const players = document.createElement('ul');
  players.className = 'lobby__players';

  const modes = document.createElement('div');
  modes.className = 'lobby__modes';

  const durations = document.createElement('div');
  durations.className = 'lobby__durations';

  const officer = document.createElement('p');
  officer.className = 'lobby__officer';
  officer.setAttribute('aria-live', 'polite');

  const footer = document.createElement('div');
  footer.className = 'lobby__footer';

  const cta = createButton({
    label: t('lobby.cta'),
    variant: 'primary',
    className: 'lobby__cta',
    onClick: () => {
      ctx.fsm.setPlayers([...ctx.session.players()]);
      ctx.fsm.setModes({ ...ctx.session.settings().modes });
      ctx.fsm.send({ type: 'open' });
    },
  });

  footer.append(cta);
  el.append(header, players, modes, durations, officer, footer);

  /* --- Rendern --- */

  const renderPlayers = (): void => {
    players.replaceChildren();

    for (const player of ctx.session.players()) {
      const item = document.createElement('li');
      item.className = 'lobby__player';

      const color = document.createElement('button');
      color.type = 'button';
      color.className = 'lobby__color';
      color.style.setProperty('--player-color', `var(--c-player-${player.colorId})`);
      color.innerHTML = symbolSvg(player.colorId);
      color.setAttribute('aria-label', t('lobby.changeColor', { name: player.name }));
      color.addEventListener('click', () => {
        ctx.session.cycleColor(player.id);
        renderPlayers();
      });

      const name = document.createElement('input');
      name.type = 'text';
      name.className = 'lobby__name';
      name.value = player.name;
      name.maxLength = 12;
      name.setAttribute('aria-label', t('lobby.playerName'));
      name.addEventListener('change', () => {
        ctx.session.renamePlayer(player.id, name.value);
        name.value = ctx.session.nameOf(player.id);
        renderOfficer();
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'lobby__remove';
      remove.textContent = '×';
      remove.disabled = !ctx.session.canRemovePlayer();
      remove.setAttribute('aria-label', t('lobby.removePlayer', { name: player.name }));
      remove.addEventListener('click', () => {
        ctx.session.removePlayer(player.id);
        renderAll();
      });

      item.append(color, name, remove);
      players.append(item);
    }

    if (ctx.session.canAddPlayer()) {
      const item = document.createElement('li');
      const add = createButton({
        label: t('lobby.addPlayer'),
        variant: 'secondary',
        className: 'lobby__add',
        onClick: () => {
          ctx.session.addPlayer();
          renderAll();
        },
      });
      item.append(add);
      players.append(item);
    }
  };

  const renderModes = (): void => {
    modes.replaceChildren();

    for (const mode of GAME_MODES) {
      const active = ctx.session.settings().modes[mode];

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mode';
      button.dataset.mode = mode;
      button.setAttribute('aria-pressed', String(active));
      button.dataset.on = String(active);

      const name = document.createElement('span');
      name.className = 'mode__name';
      name.textContent = t(`modes.${mode}.name`);

      /* Ein Satz je Modus — sie aendern die Informationsstruktur, nicht nur Zahlen. */
      const hint = document.createElement('span');
      hint.className = 'mode__hint';
      hint.textContent = t(`modes.${mode}.hint`);

      button.append(name, hint);

      /*
       * Was der Modus konkret bewirkt, sobald er an ist: wie viele Koffer der Beamte
       * dann oeffnen darf. Die Regel steht im GDD, aber am Tisch zaehlt die Zahl.
       */
      if (active && (mode === 'sniffer' || mode === 'highSeason')) {
        const effect = document.createElement('span');
        effect.className = 'mode__effect';
        effect.textContent = t('modes.openingsNow', {
          count: maxOpenings(ctx.session.players().length, ctx.session.settings().modes),
        });
        button.append(effect);
      }
      button.addEventListener('click', () => {
        ctx.session.setModes({ [mode]: !active } as Partial<Record<GameModeId, boolean>>);
        renderModes();
      });

      modes.append(button);
    }
  };

  const renderDurations = (): void => {
    durations.replaceChildren();

    durations.append(
      pickerRow(
        t('lobby.interrogationDuration'),
        INTERROGATION_PRESETS.map((sec) => ({
          label: `${sec}s`,
          active: ctx.session.settings().interrogationSec === sec,
          onSelect: () => {
            ctx.session.setSettings({ interrogationSec: sec as InterrogationSec });
            renderDurations();
          },
        }))
      ),
      pickerRow(
        t('lobby.packTimer'),
        PACK_TIMER_PRESETS.map((sec) => ({
          label: sec === 0 ? t('lobby.timerOff') : `${sec}s`,
          active: ctx.session.settings().packTimerSec === sec,
          onSelect: () => {
            ctx.session.setSettings({ packTimerSec: sec as PackTimerSec });
            renderDurations();
          },
        }))
      )
    );
  };

  const renderOfficer = (): void => {
    const count = ctx.session.players().length;

    if (count < MIN_PLAYERS) {
      officer.textContent = t('lobby.tooFewPlayers');
      officer.dataset.error = 'true';
      cta.disabled = true;
      return;
    }

    officer.dataset.error = 'false';
    cta.disabled = count > MAX_PLAYERS;

    const next = ctx.session.nextOfficer();
    officer.replaceChildren();
    if (!next) return;

    /* Text und Badge getrennt: Der Name traegt seine Farbe, der Satz nicht. */
    const label = document.createElement('span');
    label.textContent = t('lobby.officerNextLabel', { round: ctx.session.get().roundIndex + 1 });

    officer.append(label, createBadge({ name: next.name, colorId: next.colorId, small: true }));
  };

  const renderAll = (): void => {
    renderPlayers();
    renderModes();
    renderDurations();
    renderOfficer();
  };

  renderAll();

  return {
    el,
    activate() {
      /* Die Halle laedt waehrend der Lobby nach — bis zum Verhoer ist sie da. */
      preloadStage();
    },
  };
}

interface PickerOption {
  label: string;
  active: boolean;
  onSelect: () => void;
}

function pickerRow(label: string, options: PickerOption[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'picker';

  const text = document.createElement('span');
  text.className = 'picker__label';
  text.textContent = label;
  row.append(text);

  const group = document.createElement('div');
  group.className = 'picker__options';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);

  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker__btn';
    button.textContent = option.label;
    button.setAttribute('aria-pressed', String(option.active));
    button.dataset.on = String(option.active);
    button.addEventListener('click', option.onSelect);
    group.append(button);
  }

  row.append(group);
  return row;
}
