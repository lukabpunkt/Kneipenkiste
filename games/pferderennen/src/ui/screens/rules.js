/**
 * Rules screen including the note on drinking responsibly.
 *
 * Shown as an overlay rather than a screen of its own (docs/02_ARCHITECTURE.md §3). The
 * responsibility note is not fine print — it sits at the end where people actually read it
 * (docs/01_GAME_DESIGN.md §8).
 */

import { el } from '../dom.js';
import { modal } from '../components/modal.js';
import { betTypeHint, BET_TYPE_LABELS, sipWord } from '../strings.js';

/** The rules, in the order they matter at the table. */
const RULES = [
  'Jeder wählt eins der sechs Pferde und setzt seinen Einsatz.',
  'Die Pferde rennen. Unterwegs passiert Unfug – Bananenschalen, Kotzpausen, Regenbogen-Fürze.',
  'Wer aufs Siegerpferd gesetzt hat, verteilt seinen Einsatz an die anderen.',
  'Alle anderen trinken ihren eigenen Einsatz.',
  'Hat niemand aufs Siegerpferd gesetzt, gewinnt das Haus – dann trinken alle ihren Einsatz.',
];

/**
 * Names the bet type currently in force.
 * @param {{betType?: string}} settings
 * @returns {string}
 */
function activeBetType(settings) {
  if (settings.betType === 'free') return 'Frei – jeder wählt selbst';
  return BET_TYPE_LABELS[settings.betType ?? 'win'] ?? BET_TYPE_LABELS.win;
}

/**
 * Opens the rules overlay.
 * @param {{getState: Function}} store
 * @returns {{close: () => void}}
 */
export function openRules(store) {
  const settings = store.getState().settings;
  const unit = sipWord(settings, 2);

  const content = el('div', { className: 'prose' }, [
    el(
      'ol',
      { className: 'rules-list' },
      RULES.map((rule) => el('li', { text: rule })),
    ),

    el('h3', { text: 'Sind die Pferde unterschiedlich stark?' }),
    el('p', {
      text: 'Nein. Alle sechs Pferde sind spielmechanisch identisch – Name, Farbe und Charakter sind reine Kosmetik. Jedes Pferd gewinnt genau gleich oft. Es gibt kein Muster, das man lernen könnte.',
    }),

    el('h3', { text: 'Wie viel kann man setzen?' }),
    el('p', { text: `1 bis 10 ${unit} pro Rennen. Mehr geht bewusst nicht.` }),

    el('h3', { text: 'Wettarten' }),
    el(
      'ul',
      { className: 'rules-list' },
      Object.entries(BET_TYPE_LABELS).map(([type, label]) =>
        el('li', { text: `${label}: ${betTypeHint(type)}` }),
      ),
    ),
    el('p', {
      className: 'hint',
      text: `Aktuell: ${activeBetType(settings)}. Änderbar in den Einstellungen.`,
    }),

    el('h3', { text: 'Führungswechsel-Regel' }),
    el('p', {
      text: settings.leadChangeRule
        ? `An: Jeder Führungswechsel im Schlussdrittel kostet alle einen ${sipWord(settings, 1)}.`
        : `Aus. In den Einstellungen einschaltbar – dann kostet jeder Führungswechsel im Schlussdrittel alle einen ${sipWord(settings, 1)}. Sorgt fürs Mitfiebern.`,
    }),

    el('h3', { className: 'rules-care__title', text: 'Kurz zum Mitdenken' }),
    el('p', {
      className: 'rules-care',
      text: 'Trinkt verantwortungsvoll. Wasser ist auch ein Getränk. Wer fährt, spielt im Alkoholfrei-Modus um Punkte – der macht genauso viel Spaß.',
    }),
  ]);

  return modal({ title: 'So geht das hier', content });
}
