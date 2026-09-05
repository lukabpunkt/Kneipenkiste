/**
 * Schluck-Zähler der laufenden Runde (Playtest-Finding 01, ADR-27).
 *
 * ## Warum es das gibt
 *
 * Ein Playtester sagte: „Es gibt keine Konsequenzen, wenn man eine Bombe erwischt."
 * Er hatte recht, obwohl die Konsequenz da war — sie stand 2,2 Sekunden als Banner am
 * oberen Bildrand, während der Blick unten am Krater klebte, und war danach spurlos weg.
 * Wer in dem Moment das Handy weiterreichte, hat die Zahl nie gesehen. Bis zum Result
 * gab es dann keinen Ort mehr, an dem sie stand: Der Token-Stapel daneben zählt
 * **Verteil-Tokens**, also eine ganz andere Größe.
 *
 * Dieser Zähler ist die Spur, die bleibt. Kein Bestätigen-Tap — GDD §3.5 will
 * ausdrücklich, dass das Handy liegen bleibt und es weitergeht.
 *
 * ## Informationssicherheit
 *
 * Schlücke entstehen ausschließlich bei `crater` und `greed` (`core/payout.ts`), und
 * beides sind öffentliche Ergebnisse mit Banner und Farbring. Ein verbrauchter eigener
 * Trittstein erzeugt keinen Eintrag — er bleibt von einem leeren Feld ununterscheidbar
 * (ADR-2).
 */

import { colorById, hex, type ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import type { PlayerId } from '@/core/types';
import { safeAnimate } from '@/ui/animate';

export interface SipCounterOptions {
  colorOf: (playerId: PlayerId) => ColorId | undefined;
  nameOf: (playerId: PlayerId) => string | undefined;
}

export interface SipCounter {
  el: HTMLElement;
  /** Zählt die Schlücke einer Grabung dazu und lässt den Eintrag aufploppen. */
  add(playerId: PlayerId, sips: number): void;
}

/*
 * Kein `reset()`: Der Dig-Screen wird zu jeder Runde neu gebaut, und damit auch dieser
 * Zähler. Eine Methode, die niemand ruft, sähe nur so aus, als kümmerte sich jemand.
 */

export function createSipCounter(options: SipCounterOptions): SipCounter {
  const el = document.createElement('div');
  el.className = 'sip-counter';
  /*
   * **Kein `aria-hidden`**, anders als beim Token-Stapel: Das hier ist die Konsequenz,
   * nicht Deko. Höflich statt unterbrechend — das Banner meldet sich `assertive`, dieser
   * Zähler reicht seine Zahl hinterher, ohne dazwischenzureden.
   */
  el.setAttribute('aria-live', 'polite');

  const sips = new Map<PlayerId, number>();

  const render = (highlight?: PlayerId): void => {
    el.replaceChildren();

    // Der Härteste zuerst — am Tisch fragt man zuerst, wer am meisten trinken muss.
    const rows = [...sips.entries()].sort(([, a], [, b]) => b - a);

    for (const [playerId, count] of rows) {
      const colorId = options.colorOf(playerId);
      if (!colorId || count <= 0) continue;

      const chip = document.createElement('span');
      chip.className = 'sip-chip';
      chip.style.setProperty('--sip-color', hex(colorById(colorId).hex));
      chip.textContent = t('dig.sipsOf', {
        name: options.nameOf(playerId) ?? '',
        count,
      });
      el.append(chip);

      /*
       * `safeAnimate` statt `chip.animate(...)`: Die Web Animations API fehlt in jsdom
       * und in sehr alten WebViews, und ein Fehler an dieser Stelle wuerde den Dig-Screen
       * im Moment der Explosion abraeumen. Ein Pop ist ein Bonus, kein Spielzug.
       * `prefersReducedMotion` prueft der Helfer selbst.
       */
      if (playerId === highlight) {
        void safeAnimate(chip, [{ transform: 'scale(0.5)' }, { transform: 'scale(1)' }], {
          duration: 320,
          easing: 'cubic-bezier(.34,1.56,.64,1)',
        });
      }
    }
  };

  return {
    el,

    add(playerId, count) {
      if (count <= 0) return;
      sips.set(playerId, (sips.get(playerId) ?? 0) + count);
      render(playerId);
    },
  };
}
