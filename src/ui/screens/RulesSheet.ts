/**
 * Regeln als vier Karten (GDD §5, Screen 11).
 *
 * Die Reihenfolge ist die des Spiels: packen, Hinweise, Verhoer und Kontrolle,
 * Auszahlung. Die zweite Karte heisst absichtlich "Hinweise lügen manchmal" — wer das
 * einmal gelesen hat, spielt die ganze Runde anders.
 */

import { t } from '@/core/i18n';
import { openSheet, type Sheet } from '../components/sheet';

const CARDS = ['pack', 'hints', 'inspect', 'payout'] as const;

export function openRulesSheet(host: HTMLElement): Sheet {
  return openSheet(host, {
    title: t('rules.headline'),
    build: (body) => {
      const list = document.createElement('div');
      list.className = 'rules';

      for (const card of CARDS) {
        const item = document.createElement('article');
        item.className = 'rules__card';

        const title = document.createElement('h3');
        title.className = 'rules__title';
        title.textContent = t(`rules.${card}.title`);

        const text = document.createElement('p');
        text.className = 'rules__text';
        text.textContent = t(`rules.${card}.body`);

        item.append(title, text);
        list.append(item);
      }

      body.append(list);
    },
  });
}
