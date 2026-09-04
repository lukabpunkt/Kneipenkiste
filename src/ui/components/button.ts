/**
 * Sticker-Button (Art Direction §4.1).
 *
 * 64 px hoch, 20 px Radius, 3 px `ink`-Outline, 6 px Bottom-Kante in der Schattenfarbe.
 * Press-State drueckt den Button 4 px nach unten und die Kante auf 2 px — das ist der
 * gesamte Trick, warum er sich wie ein echter Knopf anfuehlt.
 */

import { play } from '@/audio/AudioManager';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  onClick?: (event: MouseEvent) => void;
  /** Inline-SVG-Markup, wird vor dem Label eingesetzt. */
  icon?: string;
  /** Wenn das Label nicht selbsterklaerend ist (Icon-only). */
  ariaLabel?: string;
  /** Idle-Wobble alle 4 s — nur fuer den Primary-CTA. */
  wobble?: boolean;
  /** Zusaetzliche Klassen, z. B. fuer Breite. */
  className?: string;
  disabled?: boolean;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn--${options.variant ?? 'primary'}`;
  if (options.className) button.classList.add(...options.className.split(' '));
  if (options.wobble) button.classList.add('btn--wobble');
  if (options.disabled) button.disabled = true;
  if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);

  if (options.icon) {
    const icon = document.createElement('span');
    icon.className = 'btn__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = options.icon;
    button.append(icon);
  }

  const label = document.createElement('span');
  label.className = 'btn__label';
  label.textContent = options.label;
  button.append(label);

  /*
   * Der Klick klingt fuer jeden Knopf gleich — ausser fuer den Primary-CTA: Der ist der
   * Knopf, der die Runde weiterbringt, und bekommt deshalb den bestaetigenden Ton.
   * Der Cue haengt am Button selbst, nicht an den Aufrufern: So gibt es keinen stummen
   * Knopf, den jemand zu vertonen vergessen hat.
   */
  const confirm = (options.variant ?? 'primary') === 'primary';
  button.addEventListener('click', (event) => {
    play(confirm ? 'ui_confirm' : 'ui_tap');
    options.onClick?.(event);
  });

  return button;
}

/** Setzt das Label nachtraeglich (z. B. Sound-Toggle). */
export function setButtonLabel(button: HTMLButtonElement, label: string): void {
  const target = button.querySelector('.btn__label');
  if (target) target.textContent = label;
}

/**
 * Chip mit Label und Wert — fuer Modus und Dauer in der Lobby (Roadmap M1.4).
 */
export interface ChipOptions {
  label: string;
  value: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export function createChip(options: ChipOptions): HTMLButtonElement {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  if (options.ariaLabel) chip.setAttribute('aria-label', options.ariaLabel);

  const label = document.createElement('span');
  label.className = 'chip__label';
  label.textContent = options.label;

  const value = document.createElement('span');
  value.className = 'chip__value';
  value.textContent = options.value;

  chip.append(label, value);
  if (options.onClick) chip.addEventListener('click', options.onClick);
  return chip;
}
