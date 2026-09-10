/**
 * Gewicht-Stepper (Art Direction §4.4, Modus "Schwergewicht").
 *
 * Der Rucksack wächst mit dem Gewicht: klein, groß, groß mit Amboss. Darunter steht die
 * Risiko-Zeile — beide Seiten der Wette in einem Satz, damit niemand 3 wählt, ohne zu
 * wissen, was ein Sturz dann kostet.
 */

import { MAX_WEIGHT, MIN_WEIGHT, type Weight } from '@/config/rules';
import { t } from '@/core/i18n';

export interface WeightStepperOptions {
  value: Weight;
  /** Was der Spieler verteilt, wenn er sicher steht — inklusive Todeszonen-Bonus. */
  givingPerWeight: number;
  onChange: (value: Weight) => void;
}

export interface WeightStepper {
  el: HTMLElement;
  value(): Weight;
}

/** Rucksack in drei Größen; ab 3 hängt ein Amboss dran. */
function backpackSvg(weight: Weight): string {
  const scale = 0.7 + weight * 0.1;
  const anvil =
    weight === MAX_WEIGHT
      ? '<path d="M16 40h16l-2 5H18Z M14 45h20v3H14Z" fill="var(--ink)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" />'
      : '';
  return `
<svg viewBox="0 0 48 52" aria-hidden="true" focusable="false" class="weight__pack">
  <g transform="translate(24 22) scale(${scale.toFixed(2)}) translate(-24 -22)">
    <rect x="12" y="12" width="24" height="26" rx="6" fill="var(--rock)" stroke="var(--ink)" stroke-width="2.5" />
    <path d="M18 12v-3a6 6 0 0 1 12 0v3" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" />
    <rect x="17" y="22" width="14" height="8" rx="3" fill="var(--rope)" stroke="var(--ink)" stroke-width="2.5" />
  </g>
  ${anvil}
</svg>`;
}

export function createWeightStepper(options: WeightStepperOptions): WeightStepper {
  let value = options.value;

  const el = document.createElement('div');
  el.className = 'weight';

  const title = document.createElement('span');
  title.className = 'weight__title';
  title.textContent = t('choose.weight');

  const pack = document.createElement('span');
  pack.className = 'weight__visual';

  const controls = document.createElement('div');
  controls.className = 'weight__controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', t('choose.weight'));

  const risk = document.createElement('p');
  risk.className = 'weight__risk';

  const render = (): void => {
    pack.innerHTML = backpackSvg(value);
    risk.textContent = t('choose.weightRisk', {
      giving: options.givingPerWeight * value,
      weight: value,
    });
    for (const button of controls.querySelectorAll<HTMLButtonElement>('button')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.weight) === value));
    }
  };

  for (let weight = MIN_WEIGHT; weight <= MAX_WEIGHT; weight += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'weight__step';
    button.dataset.weight = String(weight);
    button.textContent = String(weight);
    button.addEventListener('click', () => {
      value = weight as Weight;
      render();
      options.onChange(value);
    });
    controls.append(button);
  }

  el.append(title, pack, controls, risk);
  render();

  return { el, value: () => value };
}
