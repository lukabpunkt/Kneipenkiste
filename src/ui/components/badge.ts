/**
 * Player-Badge (Art Direction §4.2, §4.4).
 *
 * Kreis in Spielerfarbe mit `ink`-Outline und dem Symbol der Farbe — das Symbol ist der
 * Farbenblind-Fallback (GDD §3.1) und muss deshalb ueberall mitlaufen, wo Farbe
 * Identitaet traegt. Der Crook-Kopf statt des reinen Kreises kommt in M2, sobald der
 * Atlas existiert.
 *
 * Im Eid-Modus bekommt das Badge unten rechts ein rotes Wachssiegel mit dem Symbol des
 * Spielers. Es ist absichtlich auffaellig: Ein Schwur soll etwas wert sein.
 */

import { safeAnimate } from '@/ui/animate';
import { colorById, hex, textColorOn, UI_COLORS, type ColorId, type SymbolId } from '@/config/theme';

const SYMBOL_PATHS: Record<SymbolId, string> = {
  circle: '<circle cx="12" cy="12" r="7.5"/>',
  triangle: '<path d="M12 4.2 20 19H4z"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="2.5"/>',
  star: '<path d="m12 3.6 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z"/>',
  diamond: '<path d="m12 3.5 8 8.5-8 8.5-8-8.5z"/>',
  heart: '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"/>',
  bolt: '<path d="M13.6 3 6 13.4h4.6L9.8 21l7.8-10.6h-4.7z"/>',
  cross: '<path d="M9.6 3h4.8v6.6H21v4.8h-6.6V21H9.6v-6.6H3V9.6h6.6z"/>',
};

/** Inline-SVG des Farb-Symbols. */
export function symbolSvg(symbol: SymbolId, fill: string): string {
  return `<svg viewBox="0 0 24 24" fill="${fill}" aria-hidden="true">${SYMBOL_PATHS[symbol]}</svg>`;
}

export interface PlayerBadgeOptions {
  colorId: ColorId;
  /** Wird unter dem Kreis angezeigt, wenn gesetzt. */
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Eid-Modus: Wachssiegel unten rechts. */
  sworn?: boolean;
  /** Zaehler oben rechts, z. B. zugeteilte Schluecke in der Verteil-UI. */
  count?: number;
}

export function createPlayerBadge(options: PlayerBadgeOptions): HTMLElement {
  const color = colorById(options.colorId);

  const wrapper = document.createElement('div');
  wrapper.className = `badge badge--${options.size ?? 'md'}`;

  const disc = document.createElement('span');
  disc.className = 'badge__disc';
  disc.style.setProperty('--badge-color', hex(color.hex));
  disc.style.setProperty('--badge-shade', hex(color.shade));
  disc.innerHTML = symbolSvg(color.symbol, hex(textColorOn(options.colorId)));

  const seal = document.createElement('span');
  seal.className = 'badge__seal';
  seal.setAttribute('aria-hidden', 'true');
  seal.innerHTML = symbolSvg(color.symbol, hex(UI_COLORS.paper));
  disc.append(seal);

  const count = document.createElement('span');
  count.className = 'badge__count';
  count.setAttribute('aria-hidden', 'true');
  disc.append(count);

  wrapper.append(disc);

  if (options.name !== undefined) {
    const name = document.createElement('span');
    name.className = 'badge__name';
    name.textContent = options.name;
    wrapper.append(name);
  }

  setBadgeSworn(wrapper, options.sworn ?? false);
  if (options.count !== undefined) setBadgeCount(wrapper, options.count);

  return wrapper;
}

/**
 * Siegel setzen oder abnehmen (Eid-Modus, Art Direction §4.4).
 *
 * `stamp` spielt den Stempel ab: Das Siegel kommt gross und schraeg von vorn, schlaegt
 * auf und federt aus. Ein Eid ist eine oeffentliche Handlung am Tisch — er darf nicht
 * einfach eingeblendet werden, er muss knallen. Beim Zuruecknehmen bleibt es still:
 * Wer seinen Schwur zurueckzieht, bekommt dafuer keine Fanfare.
 */
export function setBadgeSworn(badge: HTMLElement, sworn: boolean, stamp = false): void {
  badge.classList.toggle('is-sworn', sworn);
  if (!sworn || !stamp) return;

  const seal = badge.querySelector<HTMLElement>('.badge__seal');
  if (!seal) return;

  void safeAnimate(
    seal,
    [
      { transform: 'scale(2.6) rotate(-24deg)', opacity: 0 },
      { transform: 'scale(0.88) rotate(4deg)', opacity: 1, offset: 0.45 },
      { transform: 'scale(1.12) rotate(-2deg)', offset: 0.65 },
      { transform: 'scale(1) rotate(0deg)' },
    ],
    { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }
  );
  // Das Badge selbst zuckt einmal — der Aufschlag geht durch die Figur.
  void safeAnimate(
    badge,
    [{ transform: 'scale(1)' }, { transform: 'scale(.93)', offset: 0.2 }, { transform: 'scale(1)' }],
    { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' }
  );
}

/** Zaehler am Badge — 0 blendet ihn aus (Verteil-UI, Art Direction §4.5). */
export function setBadgeCount(badge: HTMLElement, count: number): void {
  const el = badge.querySelector<HTMLElement>('.badge__count');
  if (!el) return;
  el.textContent = String(count);
  badge.classList.toggle('has-count', count > 0);
}
