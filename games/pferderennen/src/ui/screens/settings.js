/**
 * Settings: race length, chaos level, drinking rules, bet type, sound, accessibility.
 *
 * Every option from docs/01_GAME_DESIGN.md §6 writes straight into the state and survives a
 * reload.
 */

import { el } from '../dom.js';
import { modal } from '../components/modal.js';
import { sipWord } from '../strings.js';
import { debugOptions } from '../debug.js';

/** Declarative description of every setting, so the markup stays generic. */
const FIELDS = [
  {
    key: 'raceLength',
    label: 'Renndauer',
    options: [
      ['short', 'Kurz'],
      ['normal', 'Normal'],
      ['long', 'Lang'],
    ],
    hint: 'Ungefähr 20, 30 oder 45 Sekunden.',
  },
  {
    key: 'chaos',
    label: 'Chaos-Level',
    options: [
      ['calm', 'Ruhig'],
      ['normal', 'Normal'],
      ['wild', 'Vollgas'],
    ],
    hint: 'Wie viele Events pro Rennen passieren.',
  },
  {
    key: 'betType',
    label: 'Wettart',
    options: [
      ['win', 'Sieg'],
      ['place', 'Platz'],
      ['last', 'Letzter'],
      ['free', 'Frei'],
    ],
    hint: 'Bei „Frei" wählt jeder Spieler selbst.',
  },
  {
    key: 'eventDrinkRules',
    label: 'Event-Trinkregeln',
    toggle: true,
    hint: 'Bananenschale? Dann trinkt das Team.',
  },
  {
    key: 'leadChangeRule',
    label: 'Führungswechsel-Regel',
    toggle: true,
    hint: (settings) =>
      `Jeder Führungswechsel im Schlussdrittel kostet alle einen ${sipWord(settings, 1)}.`,
  },
  {
    key: 'sober',
    label: 'Alkoholfrei-Modus',
    toggle: true,
    hint: 'Aus Schlücken werden Punkte. Gleiches Spiel, gleicher Spaß.',
  },
  {
    key: 'sound',
    label: 'Sound',
    toggle: true,
    hint: 'Hufgetrappel, Menge, Fanfare. Startet beim ersten Tippen.',
  },
  { key: 'vibration', label: 'Vibration', toggle: true, hint: 'Nur auf dem Handy.' },
  {
    key: 'reducedMotion',
    label: 'Reduzierte Bewegung',
    options: [
      ['auto', 'Automatisch'],
      ['on', 'An'],
      ['off', 'Aus'],
    ],
    hint: 'Automatisch folgt der Systemeinstellung. Weniger Wackeln, weniger Blitze.',
  },
  {
    key: 'debugSkip',
    label: 'Rennen überspringbar',
    toggle: true,
    hint: 'Blendet im Rennen einen Überspringen-Knopf ein.',
    // A debug switch has no business in a normal evening: nobody should be able to skip the race
    // by accident (audit A7). It is in the GDD's settings table, so it stays — behind ?debug=1.
    debugOnly: true,
  },
];

/**
 * A row of choice chips.
 * @param {object} field
 * @param {any} settings
 * @param {(patch: object) => void} update
 * @returns {HTMLElement}
 */
function chipRow(field, settings, update) {
  return el(
    'div',
    { className: 'setting__options', attrs: { role: 'radiogroup', 'aria-label': field.label } },
    field.options.map(([value, label]) =>
      el('button', {
        className: `chip${settings[field.key] === value ? ' chip--active' : ''}`,
        text: label,
        attrs: {
          type: 'button',
          role: 'radio',
          'aria-checked': settings[field.key] === value ? 'true' : 'false',
        },
        on: { click: () => update({ [field.key]: value }) },
      }),
    ),
  );
}

/**
 * An on/off switch.
 * @param {object} field
 * @param {any} settings
 * @param {(patch: object) => void} update
 * @returns {HTMLElement}
 */
function toggle(field, settings, update) {
  const on = settings[field.key] === true;
  return el('button', {
    className: `switch${on ? ' switch--on' : ''}`,
    attrs: {
      type: 'button',
      role: 'switch',
      'aria-checked': on ? 'true' : 'false',
      'aria-label': field.label,
    },
    on: { click: () => update({ [field.key]: !on }) },
  });
}

/**
 * Opens the settings overlay.
 * @param {{getState: Function, dispatch: Function}} store
 * @returns {{close: () => void}}
 */
export function openSettings(store) {
  const content = el('div', { className: 'settings' });

  /** Applies a change and redraws, so the active chip updates immediately. */
  const update = (patch) => {
    store.dispatch({ type: 'settings/update', payload: patch });
    render();
  };

  const showDebug = debugOptions().enabled;

  function render() {
    const settings = store.getState().settings;
    content.replaceChildren(
      ...FIELDS.filter((field) => !field.debugOnly || showDebug).map((field) =>
        el('div', { className: 'setting' }, [
          el('div', { className: 'setting__head' }, [
            el('span', { className: 'setting__label', text: field.label }),
            field.toggle ? toggle(field, settings, update) : null,
          ]),
          field.toggle ? null : chipRow(field, settings, update),
          field.hint
            ? el('p', {
                className: 'hint',
                // A hint may be a function when its wording depends on the alcohol-free mode.
                text: typeof field.hint === 'function' ? field.hint(settings) : field.hint,
              })
            : null,
        ]),
      ),
    );
  }

  render();
  return modal({ title: 'Einstellungen', content });
}
