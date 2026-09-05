/**
 * Die Regeln, ausführlich (GDD §5, Screen 11).
 *
 * Vorher standen hier vier Sätze. Das reicht, um sich zu erinnern, aber nicht, um es zu
 * verstehen — und ein Spiel, dessen zweite Design-Säule „falsche Sicherheit" heißt, wird
 * unfair, wenn nur die Hälfte des Tisches begriffen hat, wie unzuverlässig ein Hinweis
 * ist. Deshalb: die Runde in ihrer Reihenfolge, mit den echten Zahlen.
 *
 * **Die Zahlen kommen aus `config/rules.ts`, nicht aus den Übersetzungen.** Wer das
 * Balancing ändert, ändert damit auch die Regeln, die am Tisch vorgelesen werden — sonst
 * stünde hier irgendwann etwas anderes, als das Spiel tut.
 */

import {
  BONUS_ALL_CAUGHT,
  BONUS_GOOD_INSTINCT,
  CAUGHT_SIPS_PER_ITEM,
  DEFAULT_INTERROGATION_SEC,
  DIPLOMAT_SIPS,
  HARASSMENT_SIPS,
  HINT_TRUTH_PROBABILITY,
  MAX_AMOUNT,
  MAX_AMOUNT_HIGH_SEASON,
  MAX_BRIBE,
  MAX_HINTS,
  MIN_AMOUNT,
  MIN_BRIBE,
  MIN_HINTS,
  MIN_PLAYERS,
} from '@/config/rules';
import { t, tList } from '@/core/i18n';
import { openSheet, type Sheet } from '../components/sheet';

/** Die Reihenfolge der Runde — genau so, wie sie am Tisch abläuft. */
const SECTIONS = [
  'roles',
  'pack',
  'hints',
  'interrogation',
  'inspect',
  'gate',
  'modes',
  'end',
] as const;

/**
 * Was in den Texten als `{name}` steht.
 *
 * `truth` wird zu „6 von 10" gerundet statt „0,6": Am Tisch rechnet niemand mit
 * Wahrscheinlichkeiten, und „ungefähr 6 von 10" ist die ehrlichere Auskunft.
 */
function ruleNumbers(): Record<string, string | number> {
  return {
    min: MIN_AMOUNT,
    max: MAX_AMOUNT,
    max_high: MAX_AMOUNT_HIGH_SEASON,
    hints: `${MIN_HINTS}–${MAX_HINTS}`,
    min_hints: MIN_HINTS,
    max_hints: MAX_HINTS,
    truth: Math.round(HINT_TRUTH_PROBABILITY * 10),
    seconds: DEFAULT_INTERROGATION_SEC,
    min_players: MIN_PLAYERS,
    caught: CAUGHT_SIPS_PER_ITEM,
    harassment: HARASSMENT_SIPS,
    diplomat: DIPLOMAT_SIPS,
    bonus_all: BONUS_ALL_CAUGHT,
    bonus_instinct: BONUS_GOOD_INSTINCT,
    min_bribe: MIN_BRIBE,
    max_bribe: MAX_BRIBE,
  };
}

export function openRulesSheet(host: HTMLElement): Sheet {
  return openSheet(host, {
    title: t('rules.headline'),
    build: (body) => {
      const numbers = ruleNumbers();

      const list = document.createElement('div');
      list.className = 'rules';

      const lead = document.createElement('p');
      lead.className = 'rules__lead';
      lead.textContent = t('rules.lead');
      list.append(lead);

      for (const section of SECTIONS) {
        const item = document.createElement('article');
        item.className = 'rules__card';

        const title = document.createElement('h3');
        title.className = 'rules__title';
        title.textContent = t(`rules.sections.${section}.title`);

        const text = document.createElement('p');
        text.className = 'rules__text';
        text.textContent = t(`rules.sections.${section}.body`, numbers);

        item.append(title, text);

        const points = tList(`rules.sections.${section}.points`, numbers);
        if (points.length > 0) {
          const ul = document.createElement('ul');
          ul.className = 'rules__points';
          for (const point of points) {
            const li = document.createElement('li');
            li.textContent = point;
            ul.append(li);
          }
          item.append(ul);
        }

        list.append(item);
      }

      body.append(list);
    },
  });
}
