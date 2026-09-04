/**
 * Regeln (GDD §5, Screen 8).
 *
 * Vier Karten: Minen legen, Graben, Hinweise, Auszahlung. Mehr braucht das Spiel nicht —
 * wer nach einer Runde noch fragt, hat entweder nicht zugesehen oder wir haben die
 * Erfolgskriterien verfehlt (GDD §9.1: Regeln nach einer Runde ohne Erklaerung verstanden).
 */

import { t } from '@/core/i18n';
import { openSheet, type SheetHandle } from '@/ui/components/sheet';

const CARDS = ['place', 'dig', 'hints', 'payout'] as const;

/** Das Icon je Karte — Emoji, bis der Atlas in M2 steht. */
const CARD_ICON: Record<(typeof CARDS)[number], string> = {
  place: '💣',
  dig: '⛏️',
  hints: '🔥',
  payout: '🍺',
};

export function openRulesSheet(): SheetHandle {
  const content = document.createElement('div');
  content.className = 'rules';

  for (const card of CARDS) {
    const item = document.createElement('article');
    item.className = 'rules__card';

    const icon = document.createElement('span');
    icon.className = 'rules__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = CARD_ICON[card];

    const text = document.createElement('div');

    const title = document.createElement('h3');
    title.className = 'rules__title';
    title.textContent = t(`rules.${card}.title`);

    const body = document.createElement('p');
    body.className = 'rules__body';
    body.textContent = t(`rules.${card}.body`);

    text.append(title, body);
    item.append(icon, text);
    content.append(item);
  }

  return openSheet({ title: t('rules.headline'), content });
}
