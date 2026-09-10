/**
 * Lobby (GDD §5, Screen 1).
 *
 * Drei Entscheidungen: wer mitgeht, welche Modi laufen, wie lange geredet wird. Die
 * Balkenzahl steht groß dabei — `B = n + 2` ist die eine Zahl, die das ganze Spiel
 * erklärt, und sie ändert sich, während man Spieler dazunimmt.
 */

import { GAME_MODES, MAX_PLAYERS, MIN_PLAYERS, NEGOTIATION_PRESETS, type GameModeId, type NegotiationSec } from '@/config/rules';
import { plural, t } from '@/core/i18n';
import { ICON_CLOSE, ICON_SETTINGS, createButton, createIconButton } from '../components/button';
import { createBadge } from '../components/badge';
import { openRulesSheet } from './RulesSheet';
import { openSettingsSheet } from './SettingsSheet';
import type { ScreenContext, ScreenInstance } from '../router';

const ICON_PLUS =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';

export function createLobbyScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--lobby';

  /*
   * Der Screen baut sich bei jeder Änderung komplett neu auf. Eine Einflug-Animation an
   * den Zeilen wäre deshalb bei jedem Tippen im Namensfeld wieder da — einmal hübsch,
   * beim dritten Mal Zappeln. Also fliegt die Liste nur beim ersten Aufbau ein.
   */
  let firstRender = true;
  let lastPlankCount = ctx.session.bridge().count;

  const render = (): void => {
    const players = ctx.session.players();
    const settings = ctx.session.settings();

    el.replaceChildren();

    /* --- Kopf --- */
    const header = document.createElement('header');
    header.className = 'lobby__header';

    const heading = document.createElement('h1');
    heading.className = 'lobby__headline';
    heading.textContent = t('lobby.headline');

    const tools = document.createElement('div');
    tools.className = 'lobby__tools';
    tools.append(
      createIconButton({
        icon: ICON_SETTINGS,
        ariaLabel: t('common.settings'),
        onClick: () => openSettingsSheet(ctx.host, ctx),
      })
    );

    header.append(heading, tools);

    /*
     * Die Brücke in einer Zahl — und zwar die, mit der die nächste Runde wirklich
     * startet. Nach zwei friedlichen Runden steht hier weniger als `n + 2`; die
     * theoretische Startbreite anzuzeigen wäre eine Zahl, die gleich nicht mehr stimmt.
     */
    const plankCount = ctx.session.bridge().count;
    const bridgeInfo = document.createElement('p');
    bridgeInfo.className = 'lobby__bridge';
    /* Die Zahl schlägt kurz aus, wenn sie sich ändert — sie ist die Ansage des Spiels. */
    if (plankCount !== lastPlankCount) bridgeInfo.dataset.changed = 'true';
    lastPlankCount = plankCount;
    bridgeInfo.textContent = t('lobby.bridgeInfo', {
      count: plankCount,
      players: players.length,
    });

    /* --- Spielerliste --- */
    const list = document.createElement('ul');
    list.className = 'lobby__players';

    players.forEach((player, index) => {
      const item = document.createElement('li');
      item.className = 'lobby__player';
      if (firstRender) item.style.setProperty('--row-index', String(index));

      const name = document.createElement('input');
      name.type = 'text';
      name.className = 'lobby__name';
      name.value = player.name;
      name.setAttribute('aria-label', t('lobby.rename'));
      name.maxLength = 12;
      name.addEventListener('change', () => {
        ctx.session.renamePlayer(player.id, name.value);
        render();
      });

      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'lobby__swatch';
      swatch.setAttribute('aria-label', t('lobby.cycleColor'));
      swatch.append(createBadge({ name: '', colorId: player.colorId, small: true }));
      swatch.addEventListener('click', () => {
        ctx.session.cycleColor(player.id);
        render();
      });

      item.append(swatch, name);

      if (ctx.session.canRemovePlayer()) {
        item.append(
          createIconButton({
            icon: ICON_CLOSE,
            ariaLabel: t('lobby.removePlayer', { name: player.name }),
            className: 'lobby__remove',
            onClick: () => {
              ctx.session.removePlayer(player.id);
              render();
            },
          })
        );
      }

      list.append(item);
    });

    const add = createButton({
      label: t('lobby.addPlayer'),
      variant: 'secondary',
      icon: ICON_PLUS,
      disabled: !ctx.session.canAddPlayer(),
      onClick: () => {
        ctx.session.addPlayer();
        render();
      },
    });

    /* --- Modi: Chip plus ein Satz, was er tut --- */
    const modes = document.createElement('div');
    modes.className = 'lobby__modes';

    const modesTitle = document.createElement('h2');
    modesTitle.className = 'lobby__section';
    modesTitle.textContent = t('lobby.modes');
    modes.append(modesTitle);

    for (const mode of GAME_MODES) {
      const on = settings.modes[mode];

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'mode';
      row.dataset.mode = mode;
      row.setAttribute('aria-pressed', String(on));

      const label = document.createElement('span');
      label.className = 'mode__label';
      label.textContent = t(`modes.${mode}`);

      const hint = document.createElement('span');
      hint.className = 'mode__hint';
      hint.textContent = t(`modes.${mode}Hint`);

      row.append(label, hint);
      row.addEventListener('click', () => {
        ctx.session.setModes({ [mode]: !on } as Partial<Record<GameModeId, boolean>>);
        render();
      });
      modes.append(row);
    }

    /* --- Absprache-Dauer --- */
    const duration = document.createElement('div');
    duration.className = 'lobby__duration';
    duration.setAttribute('role', 'group');
    duration.setAttribute('aria-label', t('lobby.duration'));

    const durationTitle = document.createElement('h2');
    durationTitle.className = 'lobby__section';
    durationTitle.textContent = t('lobby.duration');
    duration.append(durationTitle);

    const durationOptions = document.createElement('div');
    durationOptions.className = 'lobby__chips';
    for (const seconds of NEGOTIATION_PRESETS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip chip--toggle';
      chip.textContent = `${seconds} s`;
      chip.setAttribute('aria-pressed', String(settings.negotiationSec === seconds));
      chip.addEventListener('click', () => {
        ctx.session.setSettings({ negotiationSec: seconds as NegotiationSec });
        render();
      });
      durationOptions.append(chip);
    }
    duration.append(durationOptions);

    /* --- Start --- */
    const footer = document.createElement('footer');
    footer.className = 'lobby__footer';

    const enough = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;

    if (!enough) {
      /*
       * Kein deaktivierter Knopf ohne Erklärung: Wer zu zweit dasteht, soll lesen,
       * warum das Spiel nicht startet — und dass es an der Brücke liegt, nicht an ihm.
       */
      const hint = document.createElement('p');
      hint.className = 'lobby__error';
      hint.setAttribute('role', 'alert');
      hint.textContent = t('lobby.tooFew');
      footer.append(hint);
    }

    footer.append(
      createButton({
        label: t('lobby.cta'),
        variant: 'primary',
        disabled: !enough,
        className: 'lobby__cta',
        onClick: () => {
          ctx.fsm.setPlayers([...ctx.session.players()]);
          ctx.fsm.setModes({ ...ctx.session.settings().modes });
          ctx.fsm.send({ type: 'go' });
        },
      }),
      createButton({
        label: t('common.rules'),
        variant: 'ghost',
        onClick: () => openRulesSheet(ctx.host),
      })
    );

    const count = document.createElement('p');
    count.className = 'lobby__count';
    count.textContent = `${players.length} ${plural('common.players', players.length)}`;

    if (firstRender) list.dataset.enter = 'true';
    el.append(header, bridgeInfo, list, add, count, modes, duration, footer);
    firstRender = false;
  };

  render();
  return { el };
}
