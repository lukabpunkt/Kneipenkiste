/**
 * Entscheidungskarten TEILEN / STEHLEN (Art Direction §4.1).
 *
 * Zwei Karten, 44 % Breite, Ratio 3:4. Im Ruhezustand wippen sie gegenlaeufig — das ist
 * die einzige Bewegung auf dem Screen und zieht den Blick auf die Wahl.
 *
 * Beim Tap wird die gewaehlte Karte gross, die andere fadet, dann dreht sich die
 * gewaehlte auf ihre Rueckseite und bekommt den Stempel "VERSIEGELT". Danach gibt es
 * kein Zurueck (GDD §3.4) — deshalb ist die Versiegelung so deutlich.
 */

import { colorById, hex, textColorOn, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import type { Choice } from '@/core/types';
import { symbolSvg } from './badge';

/**
 * Zwei Glaeser, die anstossen (ADR-11).
 *
 * Das GDD wuenscht sich einen Handschlag; bei 60 px Kantenlaenge und 3,6 px Strichstaerke
 * wird daraus Matsch. Zwei anstossende Glaeser sagen dasselbe — "wir sind uns einig" —,
 * lesen sich auf einen Blick und zitieren die `share_toast`-Inszenierung aus GDD §4.4.
 */
const SHARE_ART = `<svg viewBox="0 0 64 48" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(21 9) rotate(15)">
    <path d="M-8 0h16l-3 12h-10z"/>
    <path d="M0 12v9"/>
    <path d="M-6 21h12"/>
  </g>
  <g transform="translate(43 9) rotate(-15)">
    <path d="M-8 0h16l-3 12h-10z"/>
    <path d="M0 12v9"/>
    <path d="M-6 21h12"/>
  </g>
  <path d="M32 5v-4M27 7l-3-3M37 7l3-3"/>
</svg>`;

/** Eine Hand greift nach dem Sack — auf dem Sack das Schluck-Glas (Art Direction §1). */
const STEAL_ART = `<svg viewBox="0 0 64 48" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M30 15c-6 4-9 10-9 16a8 8 0 0 0 8 8h12a8 8 0 0 0 8-8c0-6-3-12-9-16z"/>
  <path d="M30 15h10l-2-6h-6z"/>
  <path d="M32 24h6l-1 7h-4z"/>
  <path d="M35 31v3"/>
  <path d="M14 10l6 6M6 19l8 2M9 31l7-2"/>
</svg>`;

export interface ChoiceCardsOptions {
  colorId: ColorId;
  /** Maulwurf-Modus: TEILEN ist mit Ketten verriegelt (Art Direction §4.1). */
  lockedChoice?: Choice;
  onChoose: (choice: Choice) => void;
}

export interface ChoiceCards {
  el: HTMLElement;
  /** Sperrt beide Karten — nach der Wahl und waehrend der Versiegelung. */
  lock(): void;
  /** Spielt die Versiegelung ab und loest danach auf. */
  seal(choice: Choice): Promise<void>;
}

const SEAL_MS = 400;

export function createChoiceCards(options: ChoiceCardsOptions): ChoiceCards {
  const color = colorById(options.colorId);

  const el = document.createElement('div');
  el.className = 'cards';

  const build = (choice: Choice): HTMLButtonElement => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `card card--${choice}`;
    card.dataset['choice'] = choice;

    /*
     * Der Button selbst steht still, nur sein Inneres wippt und dreht sich. Ein
     * Tap-Ziel, das staendig wandert, trifft man auf einem Handy schlechter — und
     * Playwright wartet ewig auf ein "stabiles" Element.
     */
    const inner = document.createElement('span');
    inner.className = 'card__inner';

    const front = document.createElement('span');
    front.className = 'card__face card__face--front';

    const art = document.createElement('span');
    art.className = 'card__art';
    art.innerHTML = choice === 'share' ? SHARE_ART : STEAL_ART;

    const label = document.createElement('span');
    label.className = 'card__label';
    label.textContent = t(`common.${choice}`);

    front.append(art, label);

    // Rueckseite: Spielerfarbe, Symbol, Stempel. Sie ist das, was der Tisch spaeter sieht.
    const back = document.createElement('span');
    back.className = 'card__face card__face--back';
    back.style.setProperty('--card-color', hex(color.hex));
    back.style.setProperty('--card-shade', hex(color.shade));
    back.innerHTML = `
      <span class="card__symbol">${symbolSvg(color.symbol, hex(textColorOn(options.colorId)))}</span>
      <span class="card__stamp">${t('choice.sealed')}</span>`;

    inner.append(front, back);
    card.append(inner);

    if (options.lockedChoice === choice) {
      card.classList.add('is-locked');
      /*
       * Bewusst **kein** `disabled` und kein `aria-disabled`: Die Karte reagiert ja —
       * sie ruettelt und sagt "Nicht fuer dich". Ein totes Element wuerde dem Maulwurf
       * verschweigen, dass es die Karte ueberhaupt gibt.
       */
      card.setAttribute('aria-label', `${t(`common.${choice}`)} — ${t('choice.moleLocked')}`);
      const chains = document.createElement('span');
      chains.className = 'card__chains';
      chains.setAttribute('aria-hidden', 'true');
      const hint = document.createElement('span');
      hint.className = 'card__lockHint';
      hint.textContent = t('choice.moleLocked');
      inner.append(chains, hint);
    }

    return card;
  };

  const shareCard = build('share');
  const stealCard = build('steal');
  el.append(shareCard, stealCard);

  let locked = false;

  const cardFor = (choice: Choice): HTMLButtonElement => (choice === 'share' ? shareCard : stealCard);

  const onTap = (choice: Choice): void => {
    if (locked) return;
    if (options.lockedChoice === choice) {
      // Ruetteln statt nichts tun: Der Maulwurf soll merken, dass die Karte *existiert*,
      // aber nicht fuer ihn.
      const card = cardFor(choice);
      card.classList.remove('is-rattling');
      void card.offsetWidth;
      card.classList.add('is-rattling');
      return;
    }
    options.onChoose(choice);
  };

  shareCard.addEventListener('click', () => onTap('share'));
  stealCard.addEventListener('click', () => onTap('steal'));

  return {
    el,
    lock() {
      locked = true;
      shareCard.disabled = true;
      stealCard.disabled = true;
    },

    seal(choice) {
      const chosen = cardFor(choice);
      const other = choice === 'share' ? stealCard : shareCard;

      el.classList.add('is-sealing');
      other.classList.add('is-fading');
      chosen.classList.add('is-chosen');

      return new Promise((resolve) => {
        globalThis.setTimeout(() => {
          chosen.classList.add('is-flipped');
          globalThis.setTimeout(resolve, SEAL_MS);
        }, 140);
      });
    },
  };
}
