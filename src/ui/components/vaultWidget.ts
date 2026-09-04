/**
 * Tresor-Widget (Art Direction §4.2) — die DOM-Variante fuer Negotiation und Result.
 *
 * Architektur §8: Das Widget existiert zweimal. Hier als Inline-SVG mit CSS-Animationen,
 * ab M2 zusaetzlich als PIXI-Sprite auf der Buehne. Beide lesen dieselbe Quelle
 * (`assets-src/svg/vault/door.svg`) — ein PIXI-Canvas im Verhandlungs-Screen waere
 * Overkill.
 *
 * Der Muenzpegel im Fenster steigt mit dem Tresorinhalt: Man soll sehen, worum es geht,
 * bevor man die Zahl liest.
 */

import doorSvg from '../../../assets-src/svg/vault/door.svg?raw';
import type { VaultSpec } from '@/core/vault';
import { plural, t } from '@/core/i18n';
import { createFlipCounter, type FlipCounter } from './flipCounter';
import { prefersReducedMotion } from '@/ui/animate';

export interface VaultWidgetOptions {
  vault: number;
  spec: VaultSpec;
  size?: 'sm' | 'md' | 'lg';
}

export interface VaultWidget {
  el: HTMLElement;
  /** Neuer Stand. `animate: 'grow' | 'drain'` spielt die passende Bewegung ab. */
  set(vault: number, animate?: 'grow' | 'drain' | 'none'): void;
  /** Das Griffrad dreht sich (Aufdeckung startet). */
  spin(): void;
  readonly counter: FlipCounter;
}

/**
 * Fuellstand 0..1. Bezugsgroesse ist die Jackpot-Schwelle: Ein voller Tresor sieht
 * voll aus. Im Highroller-Modus kann er darueber hinauswachsen — dann bleibt der Pegel
 * oben stehen, statt aus dem Fenster zu laufen.
 */
export function vaultFill(vault: number, spec: VaultSpec): number {
  if (spec.jackpotAt <= 0) return 0;
  return Math.max(0, Math.min(1, vault / spec.jackpotAt));
}

export function createVaultWidget(options: VaultWidgetOptions): VaultWidget {
  const el = document.createElement('div');
  el.className = `vault vault--${options.size ?? 'md'}`;

  const door = document.createElement('div');
  door.className = 'vault__door';
  door.innerHTML = doorSvg;
  door.setAttribute('aria-hidden', 'true');

  const counter = createFlipCounter({
    value: options.vault,
    label: plural('common.sips', options.vault).toUpperCase(),
  });
  counter.el.classList.add('vault__counter');

  el.append(door, counter.el);
  el.setAttribute('aria-label', `${t('negotiation.vaultLabel')}: ${options.vault}`);

  let vault = options.vault;
  const applyFill = (value: number): void => {
    el.style.setProperty('--vault-fill', String(vaultFill(value, options.spec)));
    // Kurz vor dem Platzen wackelt der Tresor: "zu voll" (Art Direction §4.2).
    el.classList.toggle('is-stuffed', value >= options.spec.jackpotAt);
  };
  applyFill(vault);

  const flash = (className: string): void => {
    if (prefersReducedMotion()) return;
    el.classList.remove('is-growing', 'is-draining');
    // Reflow erzwingen, sonst startet dieselbe Animation nicht neu.
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener('animationend', () => el.classList.remove(className), { once: true });
  };

  return {
    el,
    counter,
    set(next, animate = 'none') {
      const changed = next !== vault;
      vault = next;
      counter.set(next);
      const label = counter.el.querySelector('.flip__label');
      if (label) label.textContent = plural('common.sips', next).toUpperCase();
      applyFill(next);
      el.setAttribute('aria-label', `${t('negotiation.vaultLabel')}: ${next}`);
      if (!changed || animate === 'none') return;
      flash(animate === 'grow' ? 'is-growing' : 'is-draining');
    },
    spin() {
      flash('is-spinning');
    },
  };
}
