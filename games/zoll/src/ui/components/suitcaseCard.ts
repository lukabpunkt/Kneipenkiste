/**
 * Ein Koffer als DOM-Karte — der Platzhalter, bis die PIXI-Halle in M2 uebernimmt.
 *
 * Wichtig fuer M1 und darueber hinaus: **Ein Koffer mit Hinweis sieht aus wie einer ohne**
 * (Art Direction §7). Das Hinweis-Icon ist das einzige Unterscheidungsmerkmal — kein
 * dunklerer Rand, kein Glow, kein Schiefstellen. Alles andere wuerde eine Sicherheit
 * suggerieren, die das Hinweis-Modell gar nicht hergibt (Design-Pfeiler 2).
 */

import { colorById, hex, textColorOn, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import type { HintType, PlayerId } from '@/core/types';
import { symbolSvg } from './button';

export interface SuitcaseCardOptions {
  playerId: PlayerId;
  name: string;
  colorId: ColorId;
  hints: HintType[];
  /** Waldi hat hier geschnueffelt (Spuerhund-Modus). */
  sniffed?: boolean;
  /** Bestechung angenommen. */
  locked?: boolean;
  /** Bereits geoeffnet. */
  opened?: boolean;
  /** Ergebnistext, sobald der Koffer offen ist ("4 Gummienten"). */
  reveal?: string;
  /** Tippbar? Nur dann ist die Karte ein Button. */
  onTap?: () => void;
  /** Zusatz unter dem Namen (Result-Uebersicht). */
  note?: string;
}

/** Piktogramm je Hinweis-Typ (Art Direction §4.3). */
const HINT_ICONS: Record<HintType, string> = {
  wobble: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  drip: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" fill="currentColor"/>',
  heavy: '<path d="M7 8h10l2 11H5Z" fill="currentColor"/><path d="M9.5 8V6a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="2" fill="none"/>',
  click: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  feather: '<path d="M19 5c0 7-5 12-11 13l-2-2C7 10 12 5 19 5Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 18 17 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  dog: '<circle cx="8" cy="9" r="2.2" fill="currentColor"/><circle cx="16" cy="9" r="2.2" fill="currentColor"/><circle cx="5.5" cy="14" r="2" fill="currentColor"/><circle cx="18.5" cy="14" r="2" fill="currentColor"/><ellipse cx="12" cy="17" rx="4.5" ry="3.5" fill="currentColor"/>',
};

export function hintIcon(type: HintType): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'hint-icon';
  icon.dataset.hint = type;
  icon.title = t(`hints.${type}`);
  icon.setAttribute('aria-label', t(`hints.${type}`));
  icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${HINT_ICONS[type]}</svg>`;
  return icon;
}

/**
 * Der Hinweis als Zoll-Vermerk — ein Zettel, den jemand an den Koffer geheftet hat.
 *
 * Vorher hing ein nacktes weisses Icon frei ueber dem Band: Es sah aus wie ein
 * verrutschtes Bedienelement, und man musste raten, zu welchem Koffer es gehoert. Ein
 * Zettel mit Spitze nach unten zeigt, worauf er sich bezieht, und sagt gleich, was
 * beobachtet wurde („tickt") statt nur „hier ist etwas".
 *
 * **Der Koffer selbst bleibt unangetastet** (Art Direction §7): kein Glow, kein Rand,
 * keine andere Farbe. Nur ein Zettel daneben — denn der Hinweis ist eine Beobachtung
 * ueber den Koffer, keine Eigenschaft von ihm.
 */
export function hintNote(type: HintType, reliable = false): HTMLElement {
  const note = document.createElement('div');
  note.className = 'hint-note';
  note.dataset.hint = type;
  if (reliable) note.dataset.reliable = 'true';
  note.setAttribute('aria-label', t(`hints.${type}`));

  const icon = document.createElement('span');
  icon.className = 'hint-note__icon';
  icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${HINT_ICONS[type]}</svg>`;

  /*
   * Auf dem Zettel steht die Kurzform („tickt"), im Vorlesetext der ganze Satz. Bei vier
   * Koffern nebeneinander bleiben pro Vermerk rund 64 px — „beschnueffelt" haette den
   * Nachbarn verdeckt, und ein abgeschnittenes Wort sieht aus wie ein Fehler.
   */
  const word = document.createElement('span');
  word.className = 'hint-note__word';
  word.textContent = t(`hintsShort.${type}`);

  note.append(icon, word);
  return note;
}

export function createSuitcaseCard(options: SuitcaseCardOptions): HTMLElement {
  const color = colorById(options.colorId);

  /* Tippbar → echter Button (Tastatur, Screenreader). Sonst nur ein Listeneintrag. */
  const el = document.createElement(options.onTap ? 'button' : 'div');
  if (el instanceof HTMLButtonElement) {
    el.type = 'button';
    el.addEventListener('click', options.onTap!);
  }

  el.className = 'suitcase';
  el.dataset.player = options.playerId;
  el.style.setProperty('--suitcase-color', hex(color.hex));
  el.style.setProperty('--suitcase-shade', hex(color.shade));
  el.style.setProperty('--suitcase-text', hex(textColorOn(options.colorId)));

  if (options.opened) el.dataset.state = 'opened';
  else if (options.locked) el.dataset.state = 'locked';

  /* Der Koffer selbst — Hartschale, Griff, zwei Schnallen (Art Direction §4.1). */
  const body = document.createElement('span');
  body.className = 'suitcase__body';
  body.setAttribute('aria-hidden', 'true');
  body.innerHTML = `
    <svg viewBox="0 0 64 48" focusable="false">
      <rect x="26" y="2" width="12" height="7" rx="3" fill="none" stroke="var(--c-ink)" stroke-width="3"/>
      <rect x="4" y="8" width="56" height="38" rx="7" fill="var(--suitcase-color)" stroke="var(--c-ink)" stroke-width="3"/>
      <rect x="16" y="8" width="5" height="38" fill="var(--suitcase-shade)"/>
      <rect x="43" y="8" width="5" height="38" fill="var(--suitcase-shade)"/>
      <rect x="4" y="24" width="56" height="3" fill="var(--c-ink)" opacity="0.35"/>
    </svg>`;

  /* Gepaeckanhaenger: Farbe + Symbol + Name. */
  const tag = document.createElement('span');
  tag.className = 'suitcase__tag';

  const symbol = document.createElement('span');
  symbol.className = 'suitcase__symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.innerHTML = symbolSvg(options.colorId);

  const name = document.createElement('span');
  name.className = 'suitcase__name';
  name.textContent = options.name;

  tag.append(symbol, name);

  const meta = document.createElement('span');
  meta.className = 'suitcase__meta';

  /*
   * Die Hinweis-Icons. Sie sitzen in einer eigenen Zeile unter dem Anhaenger und
   * aendern nichts am Koffer darueber — nur diese Zeile ist bei einem Koffer mit
   * Hinweis anders (Audit A3: Screenshot-Diff).
   */
  for (const hint of options.hints) meta.append(hintIcon(hint));

  if (options.sniffed) {
    const dog = hintIcon('dog');
    dog.dataset.reliable = 'true';
    meta.append(dog);
  }

  if (options.locked) {
    const lock = document.createElement('span');
    lock.className = 'suitcase__lock';
    lock.textContent = t('hall.bribeAccepted');
    meta.append(lock);
  }

  el.append(body, tag, meta);

  if (options.reveal) {
    const reveal = document.createElement('span');
    reveal.className = 'suitcase__reveal';
    reveal.textContent = options.reveal;
    el.append(reveal);
  }

  if (options.note) {
    const note = document.createElement('span');
    note.className = 'suitcase__note';
    note.textContent = options.note;
    el.append(note);
  }

  /* Ein Screenreader soll den Koffer in einem Stueck vorgelesen bekommen. */
  const parts = [options.name, ...options.hints.map((h) => t(`hints.${h}`))];
  if (options.locked) parts.push(t('hall.bribeAccepted'));
  if (options.reveal) parts.push(options.reveal);
  el.setAttribute('aria-label', parts.join(', '));

  return el;
}
