/**
 * Pack-Stepper (Art Direction §4.2).
 *
 * Riesige Zahl im Display-Font in Spielerfarbe, +/- Buttons à 72 px, Long-Press mit
 * Auto-Repeat. Bei 0 steht "Sauber" in `ok` — das ist eine legitime Wahl, keine
 * Enthaltung, und darf sich nicht wie ein leeres Feld anfuehlen.
 */

import { MIN_AMOUNT, STEPPER_REPEAT_MS } from '@/config/rules';
import { colorById, hex, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';

export interface AmountStepperOptions {
  value: number;
  max: number;
  colorId: ColorId;
  onChange?: (value: number) => void;
}

export interface AmountStepper {
  el: HTMLElement;
  getValue(): number;
  setValue(value: number): void;
  destroy(): void;
}

export function createAmountStepper(options: AmountStepperOptions): AmountStepper {
  const color = colorById(options.colorId);
  let value = clamp(options.value, options.max);

  const el = document.createElement('div');
  el.className = 'stepper';
  el.style.setProperty('--stepper-color', hex(color.hex));

  const row = document.createElement('div');
  row.className = 'stepper__row';

  const minus = createStepButton('−', t('pack.decrease'));
  const plus = createStepButton('+', t('pack.increase'));

  const number = document.createElement('output');
  number.className = 'stepper__value';
  number.setAttribute('aria-live', 'polite');

  row.append(minus, number, plus);
  el.append(row);

  const render = (punch: boolean): void => {
    number.textContent = String(value);
    number.dataset.clean = String(value === MIN_AMOUNT);
    number.setAttribute('aria-label', t('pack.amountLabel', { amount: value }));
    minus.disabled = value <= MIN_AMOUNT;
    plus.disabled = value >= options.max;

    if (punch) {
      /* Neustart der Animation erzwingen: Klasse weg, Reflow, Klasse wieder hin. */
      number.classList.remove('is-punched');
      void number.offsetWidth;
      number.classList.add('is-punched');
    }
  };

  const step = (delta: number): void => {
    const next = clamp(value + delta, options.max);
    if (next === value) return;
    value = next;
    render(true);
    options.onChange?.(value);
  };

  /* --- Long-Press mit Auto-Repeat --- */
  let initialTimer: ReturnType<typeof setTimeout> | undefined;
  let repeatTimer: ReturnType<typeof setInterval> | undefined;

  const stopRepeat = (): void => {
    if (initialTimer !== undefined) clearTimeout(initialTimer);
    if (repeatTimer !== undefined) clearInterval(repeatTimer);
    initialTimer = undefined;
    repeatTimer = undefined;
  };

  const startRepeat = (delta: number): void => {
    stopRepeat();
    initialTimer = globalThis.setTimeout(() => {
      repeatTimer = globalThis.setInterval(() => step(delta), STEPPER_REPEAT_MS.interval);
    }, STEPPER_REPEAT_MS.initial);
  };

  const bind = (button: HTMLButtonElement, delta: number): void => {
    button.addEventListener('click', () => step(delta));
    button.addEventListener('pointerdown', () => startRepeat(delta));
    button.addEventListener('pointerup', stopRepeat);
    button.addEventListener('pointercancel', stopRepeat);
    button.addEventListener('pointerleave', stopRepeat);
  };

  bind(minus, -1);
  bind(plus, +1);

  el.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(+1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  });

  render(false);

  return {
    el,
    getValue: () => value,
    setValue(next) {
      value = clamp(next, options.max);
      render(false);
    },
    destroy: stopRepeat,
  };
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(MIN_AMOUNT, Math.round(value)));
}

function createStepButton(glyph: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'stepper__btn';
  button.textContent = glyph;
  button.setAttribute('aria-label', label);
  return button;
}
