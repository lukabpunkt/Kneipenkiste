/**
 * Sticker-Button (Art Direction §4, wie Drinkshot).
 *
 * 64 px hoch, 20 px Radius, 3 px `ink`-Outline, 6 px Bottom-Kante in der Schattenfarbe.
 * Der Press-State drueckt ihn 4 px nach unten und die Kante auf 2 px — das ist der
 * ganze Trick, warum er sich wie ein echter Knopf anfuehlt.
 */

import { colorById, hex, textColorOn, type ColorId } from '@/config/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  onClick?: (event: MouseEvent) => void;
  /** Inline-SVG-Markup, wird vor dem Label eingesetzt. */
  icon?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn--${options.variant ?? 'primary'}`;
  if (options.className) button.classList.add(...options.className.split(' '));
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

  if (options.onClick) button.addEventListener('click', options.onClick);
  return button;
}

export function setButtonLabel(button: HTMLButtonElement, label: string): void {
  const target = button.querySelector('.btn__label');
  if (target) target.textContent = label;
}

/**
 * Der Knopf eines bestimmten Spielers (CLAUDE.md, GDD §5).
 *
 * Pass und Distribute sind **oeffentliche** Screens — das Handy geht herum oder liegt in
 * der Mitte, und nur einer darf tippen. Deshalb traegt so ein Knopf seine Farbe und sein
 * Symbol: Man sieht aus einem Meter Entfernung, wessen Knopf das ist.
 */
export interface PlayerButtonOptions extends ButtonOptions {
  colorId: ColorId;
}

export function createPlayerButton(options: PlayerButtonOptions): HTMLButtonElement {
  const color = colorById(options.colorId);
  const button = createButton({ ...options, variant: options.variant ?? 'primary' });

  button.classList.add('btn--player');
  button.style.setProperty('--btn-color', hex(color.hex));
  button.style.setProperty('--btn-shade', hex(color.shade));
  button.style.setProperty('--btn-text', hex(textColorOn(options.colorId)));

  const symbol = document.createElement('span');
  symbol.className = 'btn__symbol';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.innerHTML = symbolSvg(options.colorId);
  button.prepend(symbol);

  return button;
}

/**
 * Das Symbol einer Spielerfarbe als SVG.
 *
 * Farbe allein reicht nicht: Bei Deuteranopie sind Rot und Gruen kaum zu trennen, und
 * acht Huete auf einer Bruecke muessen auch dann unterscheidbar bleiben (Audit A2).
 */
export function symbolSvg(colorId: ColorId): string {
  const paths: Record<string, string> = {
    circle: '<circle cx="12" cy="12" r="7" />',
    triangle: '<path d="M12 4 20 19H4Z" />',
    square: '<rect x="5" y="5" width="14" height="14" rx="2" />',
    star: '<path d="M12 3.5 14.4 9.6 21 10.1l-5 4.3 1.6 6.4L12 17.4 6.4 20.8 8 14.4l-5-4.3 6.6-.5Z" />',
    diamond: '<path d="M12 3 21 12 12 21 3 12Z" />',
    heart: '<path d="M12 20S4 14.5 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 14.5 12 20 12 20Z" />',
    bolt: '<path d="M13.5 2 5 13h5l-1.5 9L19 11h-5.5Z" />',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />',
  };
  const symbol = colorById(colorId).symbol;
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${paths[symbol] ?? paths.circle}</svg>`;
}

/** Chip mit Label und Wert — Modus und Dauer in der Lobby. */
export interface ChipOptions {
  label: string;
  value: string;
  onClick?: () => void;
  ariaLabel?: string;
  pressed?: boolean;
}

export function createChip(options: ChipOptions): HTMLButtonElement {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  if (options.ariaLabel) chip.setAttribute('aria-label', options.ariaLabel);
  if (options.pressed !== undefined) chip.setAttribute('aria-pressed', String(options.pressed));

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

/** Ikonen-Knopf am Bildschirmrand — Heimweg und Rundenabbruch. */
export function createIconButton(options: {
  icon: string;
  ariaLabel: string;
  className?: string;
  onClick: () => void;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn';
  if (options.className) button.classList.add(...options.className.split(' '));
  button.setAttribute('aria-label', options.ariaLabel);
  button.innerHTML = options.icon;
  button.addEventListener('click', options.onClick);
  return button;
}

export const ICON_HOME =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 11.5 12 4l8 7.5M6.5 10v9h11v-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

export const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';

export const ICON_SETTINGS =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
