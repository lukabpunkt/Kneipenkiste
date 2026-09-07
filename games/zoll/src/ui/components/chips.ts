/**
 * Kleine Zustands-Chips fuer die oeffentlichen Screens.
 *
 * Alle drei tragen die Farbe des Beamten, wenn sie ihm gehoeren — auf einem Handy in
 * der Tischmitte muss ohne Erklaerung klar sein, wer tippen darf (CLAUDE.md).
 */

import { colorById, hex, textColorOn, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import type { BribeAmount } from '@/core/types';
import { symbolSvg } from './button';

/**
 * "Öffnungen: ● ● ○" — wie viele Koffer der Beamte noch oeffnen darf.
 *
 * Im Spuerhund-Modus steht daneben, **warum** es eine weniger ist. Ohne diesen Hinweis
 * wirkt die Regel wie ein Fehler: Der Beamte hat einen verlaesslichen Hinweis bekommen
 * und darf dafuer seltener oeffnen (GDD §3.7) — das ist ein Tausch, kein Malus.
 */
export function createOpeningsChip(options: {
  left: number;
  max: number;
  colorId: ColorId;
  /** Spuerhund-Modus aktiv. */
  sniffer?: boolean;
}): HTMLElement {
  const el = document.createElement('div');
  el.className = 'openings';
  el.style.setProperty('--openings-color', hex(colorById(options.colorId).hex));

  const label = document.createElement('span');
  label.className = 'openings__label';
  label.textContent = t('inspect.openings', { left: options.left });

  const dots = document.createElement('span');
  dots.className = 'openings__dots';
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < options.max; i++) {
    const dot = document.createElement('span');
    dot.className = 'openings__dot';
    dot.dataset.used = String(i >= options.left);
    dots.append(dot);
  }

  el.append(label, dots);

  if (options.sniffer === true) {
    const note = document.createElement('span');
    note.className = 'openings__note';
    note.textContent = t('inspect.snifferNote');
    note.title = t('modes.sniffer.hint');
    el.append(note);
  }

  return el;
}

/** "Bestechen: 1 · 2 · 3" unter einem Koffer (Modus Bestechung). */
export function createBribeChip(options: {
  colorId: ColorId;
  disabled?: boolean;
  onOffer: (amount: BribeAmount) => void;
}): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bribe';
  el.style.setProperty('--bribe-color', hex(colorById(options.colorId).hex));
  /*
   * Nur die drei Zahlen, kein Wortlabel: Bei fünf Koffern nebeneinander überlappten sich
   * sonst die Chips. Was sie bedeuten, steht in der `aria-label` jedes Knopfes und in der
   * Sprechblase, sobald jemand bietet.
   */
  el.setAttribute('aria-label', t('hall.bribeOffer'));
  el.title = t('hall.bribeOffer');

  for (const amount of [1, 2, 3] as BribeAmount[]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bribe__btn';
    button.textContent = String(amount);
    button.setAttribute('aria-label', t('hall.bribeSpeech', { amount }));
    button.disabled = options.disabled === true;
    button.addEventListener('click', () => options.onOffer(amount));
    el.append(button);
  }

  return el;
}

/** Token-Stapel im Distribute-Screen: wie viele Schlücke noch zu vergeben sind. */
export function createTokenStack(options: { total: number; left: number; colorId: ColorId }): HTMLElement {
  const color = colorById(options.colorId);

  const el = document.createElement('div');
  el.className = 'tokens';
  el.style.setProperty('--token-color', hex(color.hex));
  el.style.setProperty('--token-shade', hex(color.shade));
  el.style.setProperty('--token-text', hex(textColorOn(options.colorId)));
  el.setAttribute('aria-label', String(options.left));

  for (let i = 0; i < options.total; i++) {
    const token = document.createElement('span');
    token.className = 'tokens__coin';
    token.dataset.spent = String(i >= options.left);
    token.setAttribute('aria-hidden', 'true');
    token.innerHTML = symbolSvg(options.colorId);
    el.append(token);
  }

  return el;
}
