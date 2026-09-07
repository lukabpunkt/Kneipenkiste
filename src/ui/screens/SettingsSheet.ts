/**
 * Einstellungen (GDD §5, Screen 9).
 *
 * Alles, was hier steht, ist entweder Komfort (Ton, Vibration, Sprache) oder eine
 * Antwort auf ein Gerät (weniger Effekte). Balancing steht **nicht** hier — das lebt in
 * `config/rules.ts` und braucht einen ADR.
 */

import {
  NEGOTIATION_PRESETS,
  PACE_PRESETS,
  THINK_TIMER_PRESETS,
  type NegotiationSec,
  type Pace,
  type ThinkTimerSec,
} from '@/config/rules';
import { LOCALES } from '@/core/i18n';
import { setLocale, t } from '@/core/i18n';
import { setHapticsEnabled } from '../haptics';
import { createButton } from '../components/button';
import { openSheet, type Sheet } from '../components/sheet';
import type { ScreenContext } from '../router';

/** Eine Reihe von Knöpfen, von denen genau einer gedrückt ist. */
function optionRow<T extends string | number>(
  label: string,
  values: readonly T[],
  current: T,
  format: (value: T) => string,
  onPick: (value: T) => void
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings__row';

  const title = document.createElement('span');
  title.className = 'settings__label';
  title.textContent = label;

  const group = document.createElement('div');
  group.className = 'settings__options';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);

  for (const value of values) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings__option';
    button.textContent = format(value);
    button.setAttribute('aria-pressed', String(value === current));
    button.addEventListener('click', () => onPick(value));
    group.append(button);
  }

  row.append(title, group);
  return row;
}

function toggleRow(label: string, current: boolean, onToggle: (value: boolean) => void): HTMLElement {
  const row = document.createElement('label');
  row.className = 'settings__row settings__row--toggle';

  const title = document.createElement('span');
  title.className = 'settings__label';
  title.textContent = label;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'settings__toggle';
  input.checked = current;
  input.addEventListener('change', () => onToggle(input.checked));

  row.append(title, input);
  return row;
}

export function openSettingsSheet(host: HTMLElement, ctx: ScreenContext): Sheet {
  return openSheet(host, {
    title: t('common.settings'),
    build: (body, close) => {
      const settings = ctx.session.settings();

      const rebuild = (): void => {
        close();
        openSettingsSheet(host, ctx);
      };

      body.append(
        optionRow<NegotiationSec>(
          t('lobby.duration'),
          NEGOTIATION_PRESETS,
          settings.negotiationSec,
          (value) => `${value} s`,
          (value) => {
            ctx.session.setSettings({ negotiationSec: value });
            rebuild();
          }
        ),
        optionRow<ThinkTimerSec>(
          t('settings.thinkTimer'),
          THINK_TIMER_PRESETS,
          settings.thinkTimerSec,
          (value) => (value === 0 ? t('settings.thinkTimerOff') : `${value} s`),
          (value) => {
            ctx.session.setSettings({ thinkTimerSec: value });
            rebuild();
          }
        ),
        optionRow<Pace>(
          t('lobby.pace'),
          PACE_PRESETS,
          settings.pace,
          (value) => t(`pace.${value}`),
          (value) => {
            ctx.session.setSettings({ pace: value });
            rebuild();
          }
        ),
        toggleRow(t('settings.sound'), settings.sound, (value) => ctx.session.setSettings({ sound: value })),
        toggleRow(t('settings.haptics'), settings.haptics, (value) => {
          ctx.session.setSettings({ haptics: value });
          setHapticsEnabled(value);
        }),
        toggleRow(t('settings.lowEffects'), settings.lowEffects, (value) =>
          ctx.session.setSettings({ lowEffects: value })
        ),
        optionRow(
          t('settings.language'),
          LOCALES,
          settings.locale,
          (value) => value.toUpperCase(),
          (value) => {
            ctx.session.setSettings({ locale: value });
            setLocale(value);
            close();
            /* Der ganze Screen ist übersetzt — er muss neu gebaut werden, nicht nachgepflegt. */
            void ctx.router.refresh();
          }
        )
      );

      /*
       * Die einzige Stelle, an der eine laufende Partie endet.
       *
       * Seit "Auf die Brücke" nichts mehr zurücksetzt, ist das kein Komfortknopf, sondern
       * der vorgesehene Weg: Statistik, Rundenzähler, verbrauchte Seile und die
       * geschrumpfte Brücke gehen — die Spieler bleiben.
       */
      const reset = createButton({
        label: t('settings.reset'),
        variant: 'danger',
        className: 'settings__reset',
        onClick: () => {
          ctx.session.resetProgress();
          ctx.fsm.hydrate({
            bridge: ctx.session.bridge(),
            ropeUsage: ctx.session.ropeUsage(),
            roundIndex: 0,
          });
          close();
          void ctx.router.refresh();
        },
      });
      body.append(reset);
    },
  });
}
