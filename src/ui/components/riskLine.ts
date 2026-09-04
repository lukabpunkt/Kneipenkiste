/**
 * Risiko-Zeile unter dem Stepper (Art Direction §4.2, GDD §3.2).
 *
 * "Erwischt = 8 Schlücke · Durch = 4 verteilen". Sie macht den Einsatz explizit —
 * ohne sie ist "wie viel schmuggeln?" eine Bauchentscheidung ohne Preisschild, und
 * Design-Pfeiler 3 (skalierbarer Bluff) haengt genau an diesem Preisschild.
 */

import { CAUGHT_SIPS_PER_ITEM, MIN_AMOUNT } from '@/config/rules';
import { t } from '@/core/i18n';

export interface RiskLine {
  el: HTMLElement;
  update(amount: number): void;
}

export function createRiskLine(amount = MIN_AMOUNT): RiskLine {
  const el = document.createElement('p');
  el.className = 'risk-line';
  el.setAttribute('aria-live', 'polite');

  const update = (value: number): void => {
    if (value <= MIN_AMOUNT) {
      el.textContent = t('pack.riskClean');
      el.dataset.clean = 'true';
      return;
    }
    el.dataset.clean = 'false';
    el.textContent = t('pack.risk', {
      caught: value * CAUGHT_SIPS_PER_ITEM,
      tokens: value,
    });
  };

  update(amount);
  return { el, update };
}
