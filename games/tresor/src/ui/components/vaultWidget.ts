/**
 * Tresor-Widget (Art Direction §4.2) — die DOM-Variante fuer Negotiation und Result.
 *
 * Architektur §8: Das Widget existiert zweimal. Hier als Inline-SVG mit CSS-Animationen,
 * auf der Buehne als PIXI-Sprites. Ein PIXI-Canvas im Verhandlungs-Screen waere Overkill.
 *
 * Die beiden Varianten teilen sich bewusst **keine** Datei: Die Buehne muss die Tuer
 * aufschwingen lassen, dafuer braucht sie Einzelteile (`assets-src/svg/vault/*`). Diese
 * hier ist ein Stueck (`assets-src/svg/dom/vault-door.svg`) und liegt deshalb ausserhalb
 * der Atlas-Kategorien.
 *
 * Der Muenzpegel im Fenster steigt mit dem Tresorinhalt: Man soll sehen, worum es geht,
 * bevor man die Zahl liest.
 */

import doorSvg from '../../../assets-src/svg/dom/vault-door.svg?raw';
import type { VaultSpec } from '@/core/vault';
import { plural, t } from '@/core/i18n';
import { createFlipCounter, type FlipCounter } from './flipCounter';
import { prefersReducedMotion } from '@/ui/animate';

/** Ab diesem Fuellstand zittert der Tresor (Art Direction §4.2). */
const HEAVY_FILL = 0.66;

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
    const fill = vaultFill(value, options.spec);
    el.style.setProperty('--vault-fill', String(fill));
    /*
     * Zwei Stufen statt einer (Art Direction §4.2): Ab zwei Dritteln zittert der Tresor
     * leise — man soll spueren, dass es teuer wird, **bevor** die Zahl gefaehrlich
     * aussieht. Am Jackpot wackelt er richtig.
     */
    el.classList.toggle('is-heavy', fill >= HEAVY_FILL && value < options.spec.jackpotAt);
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
