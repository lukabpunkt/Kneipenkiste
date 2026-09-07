/**
 * Fahnen-Reihe (Art Direction §4.3, Modus "Fahne").
 *
 * Öffentlich, während der Absprache: Jeder Spieler hat einen Knopf "Fahne auf …", die
 * gesetzte Fahne erscheint auf dem Balken, für alle sichtbar. Mehrere Fahnen auf
 * demselben Balken sind erlaubt — das ist kein Fehler, sondern ein sichtbarer Konflikt,
 * über den geredet werden soll.
 */

import { t } from '@/core/i18n';
import { createBadge } from './badge';
import type { ColorId } from '@/config/theme';
import type { PlankId, PlayerId } from '@/core/types';

export interface FlagRowPlayer {
  id: PlayerId;
  name: string;
  colorId: ColorId;
  flag?: PlankId;
}

export interface FlagRowOptions {
  players: FlagRowPlayer[];
  planks: PlankId[];
  /** `plank === null` holt die Fahne wieder ein. */
  onFlag: (playerId: PlayerId, plank: PlankId | null) => void;
}

export function createFlagRow(options: FlagRowOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'flag-row';

  for (const player of options.players) {
    const row = document.createElement('div');
    row.className = 'flag-row__player';

    row.append(
      createBadge({
        name: player.name,
        colorId: player.colorId,
        small: true,
        ...(player.flag !== undefined ? { note: t('common.plank', { n: player.flag }) } : {}),
      })
    );

    const picker = document.createElement('div');
    picker.className = 'flag-row__picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', t('negotiation.flagOf', { name: player.name, plank: player.flag ?? '–' }));

    for (const plank of options.planks) {
      const chosen = player.flag === plank;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'flag-row__plank';
      button.dataset.plank = String(plank);
      button.setAttribute('aria-pressed', String(chosen));
      button.setAttribute('aria-label', t('choose.plankLabel', { n: plank }));
      button.textContent = String(plank);
      /* Nochmal tippen holt die Fahne ein — man darf es sich überlegen, solange geredet wird. */
      button.addEventListener('click', () => options.onFlag(player.id, chosen ? null : plank));
      picker.append(button);
    }

    row.append(picker);
    el.append(row);
  }

  return el;
}
