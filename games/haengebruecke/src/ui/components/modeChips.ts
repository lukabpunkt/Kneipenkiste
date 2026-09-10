/**
 * Welche Sonderregeln in dieser Runde gelten (Roadmap M5.2).
 *
 * Die Modi werden in der Lobby gewählt und dort auch erklärt — aber gewählt hat sie
 * einer, gespielt wird zu fünft. Wer das Handy in der Absprache zum ersten Mal in der
 * Hand hat, muss ohne Nachfragen sehen, dass heute ein Balken morsch ist.
 *
 * Bewusst nur die **eingeschalteten**: Eine Liste, auf der drei von fünf durchgestrichen
 * sind, liest niemand zu Ende.
 */

import { GAME_MODES, type GameModeId } from '@/config/rules';
import { t } from '@/core/i18n';

export function createModeChips(modes: Readonly<Record<GameModeId, boolean>>): HTMLElement | null {
  const active = GAME_MODES.filter((mode) => modes[mode]);
  if (active.length === 0) return null;

  const el = document.createElement('ul');
  el.className = 'mode-chips';
  el.setAttribute('aria-label', t('lobby.modes'));

  for (const mode of active) {
    const item = document.createElement('li');
    item.className = 'chip chip--mode';
    item.dataset.mode = mode;

    const label = document.createElement('span');
    label.className = 'chip__label';
    label.textContent = t(`modes.${mode}`);

    /*
     * Der erklärende Satz steht daneben, nicht in einem Tooltip: Auf einem Handy gibt es
     * kein Hover, und ein Chip, den man antippen muss, um ihn zu verstehen, wird nicht
     * angetippt.
     */
    const hint = document.createElement('span');
    hint.className = 'chip__hint';
    hint.textContent = t(`modes.${mode}Hint`);

    item.append(label, hint);
    el.append(item);
  }

  return el;
}
