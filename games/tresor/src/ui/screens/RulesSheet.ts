/**
 * Regeln als Karten (GDD §5, Screen 9): Tresor, Verhandeln, Geheim wählen, Auszahlung.
 *
 * Karten, nicht Absätze: Wer in der Kneipe die Regeln nachschlägt, wischt — er liest
 * nicht (GDD Pfeiler 4, Zero Friction).
 *
 * Die fünfte Karte gibt es nur im Kronzeugen-Modus. Modus-Regeln stehen sonst als ein
 * Satz in der Lobby; der Kronzeuge braucht mehr, weil er als einziger Modus **nach** der
 * Aufdeckung eingreift und weil seine Ausnahme (Meineidige dürfen nicht handeln) sonst
 * nirgends steht.
 */

import type { Settings } from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '@/ui/components/button';
import { openSheet, type SheetHandle } from '@/ui/components/sheet';
import { createModesSheet } from './ModesSheet';

const CARDS = ['vault', 'negotiate', 'choose', 'payout'] as const;
const WITNESS_CARD = 'witness' as const;

export function createRulesSheet(settings: Settings): SheetHandle {
  const content = document.createElement('div');

  const track = document.createElement('div');
  track.className = 'rules__track';

  const dots = document.createElement('div');
  dots.className = 'rules__dots';

  const cards: readonly string[] = settings.modes.witness ? [...CARDS, WITNESS_CARD] : CARDS;

  cards.forEach((id, index) => {
    const card = document.createElement('article');
    card.className = 'rules__card';

    const number = document.createElement('span');
    number.className = 'rules__number';
    number.textContent = String(index + 1);

    const title = document.createElement('h3');
    title.className = 'rules__title';
    title.textContent = t(`rules.${id}Title`);

    const body = document.createElement('p');
    body.className = 'rules__body';
    // Die Verhandlungskarte nennt die tatsaechlich eingestellte Dauer, nicht die 30 s
    // aus dem GDD — sonst stimmt der Text nicht mit dem Countdown ueberein.
    body.textContent = t(`rules.${id}Body`, { count: settings.negotiationSec });

    card.append(number, title, body);
    track.append(card);

    const dot = document.createElement('span');
    dot.className = 'rules__dot';
    dot.classList.toggle('is-active', index === 0);
    dots.append(dot);
  });

  // Der Punkt unten zeigt, wo man ist — sonst wischt man ins Leere.
  track.addEventListener('scroll', () => {
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    [...dots.children].forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  });

  /*
   * Die Modi stehen nicht auf den Karten: Sie gelten nur, wenn sie an sind, und vier
   * zusaetzliche Karten wuerden die vier Grundregeln verwaessern. Stattdessen ein Weg
   * dorthin — wer die Regeln nachschlaegt, sucht oft genau das.
   */
  const guide = createButton({
    label: t('modeGuide.headline'),
    variant: 'ghost',
    className: 'rules__guide',
    onClick: () => createModesSheet(settings),
  });

  content.append(track, dots, guide);

  return openSheet({ title: t('rules.headline'), content, className: 'sheet__panel--tall' });
}
