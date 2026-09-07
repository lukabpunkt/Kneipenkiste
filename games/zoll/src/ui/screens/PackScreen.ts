/**
 * Pack (GDD §5, Screen 4) — die geheime Entscheidung.
 *
 * Hier faellt der eigentliche Bluff: nicht *ob*, sondern *wie viel*. Deshalb steht die
 * Risiko-Zeile direkt unter dem Stepper und der Koffer fuellt sich sichtbar — die Menge
 * muss sich nach etwas anfuehlen, bevor man den Deckel zumacht.
 *
 * Dieser Screen bekommt nur `packView`: das eigene Pack und, falls zutreffend, die
 * eigene Immunitaet. Was die anderen gepackt haben, existiert hier nicht.
 */

import { colorById, hex } from '@/config/theme';
import { t } from '@/core/i18n';
import { maxAmount } from '@/core/modes';
import type { ItemSet } from '@/core/types';
import { createButton } from '../components/button';
import { showCoachmark } from '../components/coachmark';
import { createRiskLine } from '../components/riskLine';
import { createAmountStepper } from '../components/stepper';
import { showToast } from '../components/toast';
import { vibrate } from '../haptics';
import type { ScreenContext, ScreenInstance } from '../router';

/** Ein Emoji je Item-Set — bis die Sprites in M2 kommen (ADR-5: ein Set pro Runde). */
const ITEM_GLYPHS: Record<ItemSet, string> = {
  ducks: '🦆',
  cheese: '🧀',
  gnomes: '🧙',
  flamingos: '🦩',
  pineapples: '🍍',
  sombreros: '🎩',
  cuckoo: '🕰️',
  cacti: '🌵',
};

/** Saubere Ware — sie fuellt den Rest, damit der Koffer immer voll aussieht (GDD §3.2). */
const CLEAN_GLYPHS = ['🧦', '🪥', '🧴', '📖', '🩳'];

export function createPackScreen(ctx: ScreenContext): ScreenInstance {
  const travelerId = ctx.fsm.currentTraveler()!;
  const limit = maxAmount(ctx.fsm.context.modes);
  const view = ctx.ownPack(travelerId);

  const colorId = ctx.session.colorOf(travelerId);
  const color = colorById(colorId);

  const el = document.createElement('main');
  el.className = 'screen screen--pack';
  el.style.setProperty('--pack-color', hex(color.hex));

  const headline = document.createElement('h1');
  headline.className = 'pack__headline';
  headline.textContent = t('pack.headline');

  /* --- Der Koffer: sichtbar gefuellt --- */
  const suitcase = document.createElement('div');
  suitcase.className = 'pack__suitcase';
  suitcase.setAttribute('aria-hidden', 'true');

  const grid = document.createElement('div');
  grid.className = 'pack__grid';
  suitcase.append(grid);

  const label = document.createElement('p');
  label.className = 'pack__label';

  const risk = createRiskLine(view.amount);

  const stepper = createAmountStepper({
    value: view.amount,
    max: limit,
    colorId,
    onChange: (value) => {
      renderContents(value);
      risk.update(value);
      vibrate('tap');
    },
  });

  const close = createButton({
    label: t('pack.close'),
    variant: 'primary',
    className: 'pack__close',
    onClick: () => confirm(stepper.getValue()),
  });

  el.append(headline, suitcase, label, stepper.el, risk.el);

  /* Die Immunitaet erfaehrt nur der Diplomat selbst, und nur hier. */
  if (view.hasImmunity) {
    const immunity = document.createElement('p');
    immunity.className = 'pack__immunity';
    immunity.textContent = t('pack.immunity');
    el.append(immunity);
  }

  el.append(close);

  /**
   * Fuellt den Koffer: erst die Schmuggelware, dann saubere Ware bis der Koffer voll ist.
   * Der Koffer sieht bei 0 und bei 6 gleich voll aus — nur der Inhalt ist ein anderer.
   */
  function renderContents(amount: number): void {
    const slots = Math.max(6, limit);
    /*
     * Zwei volle Reihen, egal ob 6 oder 10 Plaetze. Der Koffer muss bei 0 genauso voll
     * aussehen wie bei 6 (GDD §3.2) — eine halb leere Reihe waere schon eine Aussage.
     */
    grid.style.setProperty('--pack-cols', String(Math.ceil(slots / 2)));
    grid.replaceChildren();

    for (let i = 0; i < slots; i++) {
      const cell = document.createElement('span');
      cell.className = 'pack__item';
      if (i < amount) {
        cell.dataset.kind = 'contraband';
        cell.textContent = ITEM_GLYPHS[view.itemSet];
      } else {
        cell.dataset.kind = 'clean';
        cell.textContent = CLEAN_GLYPHS[i % CLEAN_GLYPHS.length]!;
      }
      grid.append(cell);
    }

    label.textContent = amount === 0 ? t('pack.clean') : t('pack.contraband');
    label.dataset.clean = String(amount === 0);
  }

  let done = false;
  function confirm(amount: number): void {
    if (done) return;
    done = true;
    stopTimer();
    vibrate('suitcaseClose');
    ctx.fsm.send({ type: 'closeSuitcase', amount });
  }

  /* --- Bedenkzeit (Setting): laeuft sie ab, wird sauber gepackt --- */
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  renderContents(view.amount);

  return {
    el,
    activate() {
      showCoachmark(el, 'pack', t('onboarding.pack'));

      const seconds = ctx.session.settings().packTimerSec;
      if (seconds <= 0) return;
      timer = globalThis.setTimeout(() => {
        showToast(el, t('pack.timeout'));
        confirm(0);
      }, seconds * 1000);
    },
    destroy() {
      stopTimer();
      stepper.destroy();
    },
  };
}
