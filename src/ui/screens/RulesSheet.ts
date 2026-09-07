/**
 * Regeln in drei Karten (GDD §5, Screen 9).
 *
 * Drei Sätze, nicht neun: Wer vor einer Runde ein Regelwerk liest, spielt sie nicht mehr.
 * Die Reihenfolge ist die des Spiels — wählen, stehen, schrumpfen.
 */

import { t } from '@/core/i18n';
import { openSheet, type Sheet } from '../components/sheet';

const CARDS = [
  { title: 'rules.card1Title', body: 'rules.card1Body', icon: '🪵' },
  { title: 'rules.card2Title', body: 'rules.card2Body', icon: '💦' },
  { title: 'rules.card3Title', body: 'rules.card3Body', icon: '🪚' },
] as const;

export function openRulesSheet(host: HTMLElement): Sheet {
  return openSheet(host, {
    title: t('rules.headline'),
    build: (body) => {
      const list = document.createElement('div');
      list.className = 'rules';

      for (const card of CARDS) {
        const item = document.createElement('article');
        item.className = 'rules__card';

        const icon = document.createElement('span');
        icon.className = 'rules__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = card.icon;

        const title = document.createElement('h3');
        title.className = 'rules__title';
        title.textContent = t(card.title);

        const text = document.createElement('p');
        text.className = 'rules__body';
        text.textContent = t(card.body);

        item.append(icon, title, text);
        list.append(item);
      }

      body.append(list);
    },
  });
}
