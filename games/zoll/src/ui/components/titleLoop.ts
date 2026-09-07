/**
 * Der Title-Loop (GDD §5, Screen 0).
 *
 * Ein Koffer rollt durch das Röntgengerät und zeigt wechselnde Silhouetten. Er erklärt
 * das Spiel in fünf Sekunden, ohne ein Wort — und er ist das Erste, was jemand sieht.
 *
 * Bewusst **kein PIXI**: Der Titel darf nicht auf den Hall-Chunk warten (149 KB), und
 * ein Loop aus Inline-SVG und CSS kostet nichts, läuft sofort und ist bei „Bewegung
 * reduzieren" mit einer Zeile abzuschalten. Die echte Halle beginnt in der Lobby.
 *
 * Audit A5 fordert „Title-Loop 10 min ohne Leak": Deshalb genau **ein** Intervall, das
 * beim Verlassen des Screens abgeräumt wird, und keine Elemente, die nachwachsen.
 */

import { ITEM_SETS, type ItemSet } from '@/config/rules';
import { UI_COLORS, hex } from '@/config/theme';
import { prefersReducedMotion } from '../motion';

/** Wie lange eine Silhouette steht, bevor die nächste kommt. */
const SWAP_MS = 2400;

/** Grob vereinfachte Umrisse — sie müssen als Röntgenbild lesbar sein, nicht als Sprite. */
const SHAPES: Record<ItemSet, string> = {
  ducks: '<ellipse cx="30" cy="40" rx="24" ry="12"/><circle cx="40" cy="22" r="12"/><path d="M51 22 L60 26 L51 30 Z"/>',
  cheese: '<path d="M6 46 L6 22 L54 12 L54 46 Z"/>',
  gnomes: '<path d="M30 6 L46 32 H14 Z"/><circle cx="30" cy="38" r="12"/><path d="M18 50 H42 L46 56 H14 Z"/>',
  flamingos: '<ellipse cx="28" cy="44" rx="18" ry="11"/><path d="M34 36 C34 20 22 20 22 12" stroke-width="8" fill="none"/><circle cx="21" cy="10" r="8"/>',
  pineapples: '<ellipse cx="30" cy="38" rx="17" ry="21"/><path d="M30 6 L22 20 M30 6 L38 20 M30 6 V20" stroke-width="5" fill="none"/>',
  sombreros: '<ellipse cx="30" cy="42" rx="28" ry="9"/><path d="M16 40 C16 22 22 14 30 14 C38 14 44 22 44 40 Z"/>',
  cuckoo: '<path d="M30 6 L52 24 H8 Z"/><rect x="12" y="22" width="36" height="30" rx="4"/>',
  cacti: '<rect x="22" y="14" width="16" height="38" rx="8"/><path d="M22 30 H14 A6 6 0 0 0 8 36 V44" stroke-width="8" fill="none"/><path d="M38 26 H46 A6 6 0 0 1 52 32 V40" stroke-width="8" fill="none"/>',
};

export interface TitleLoop {
  el: HTMLElement;
  destroy(): void;
}

export function createTitleLoop(): TitleLoop {
  const el = document.createElement('div');
  el.className = 'title-loop';
  el.setAttribute('aria-hidden', 'true');

  /* Das Gerät: Kasten mit Warnstreifen, Tunnel, Monitor darüber. */
  el.innerHTML = `
    <svg class="title-loop__scene" viewBox="0 0 220 150" focusable="false">
      <rect x="70" y="6" width="80" height="52" rx="8" fill="${hex(UI_COLORS.steelDark)}"/>
      <rect x="77" y="13" width="66" height="38" rx="4" fill="${hex(UI_COLORS.xrayBg)}"/>
      <g class="title-loop__silhouette" fill="${hex(UI_COLORS.xrayGlow)}" stroke="${hex(UI_COLORS.xrayGlow)}"
         transform="translate(80 16) scale(0.62)"></g>
      <rect x="77" y="13" width="66" height="38" fill="url(#scan)" opacity="0.35"/>
      <defs>
        <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill="${hex(UI_COLORS.xrayBg)}"/>
        </pattern>
      </defs>

      <rect x="60" y="64" width="100" height="56" rx="8" fill="${hex(UI_COLORS.steel)}"
            stroke="${hex(UI_COLORS.ink)}" stroke-width="4"/>
      <rect x="60" y="64" width="100" height="9" fill="${hex(UI_COLORS.customs)}"/>
      <rect x="74" y="82" width="72" height="34" rx="4" fill="${hex(UI_COLORS.ink)}"/>

      <rect x="0" y="118" width="220" height="16" fill="${hex(UI_COLORS.belt)}"/>
      <rect x="0" y="116" width="220" height="4" rx="2" fill="${hex(UI_COLORS.steel)}"/>

      <g class="title-loop__case">
        <rect x="-22" y="-30" width="44" height="30" rx="6" fill="${hex(UI_COLORS.customs)}"
              stroke="${hex(UI_COLORS.ink)}" stroke-width="4"/>
        <path d="M-8 -30 V-36 A8 8 0 0 1 8 -36 V-30" fill="none"
              stroke="${hex(UI_COLORS.ink)}" stroke-width="4"/>
      </g>
    </svg>`;

  const silhouette = el.querySelector<SVGGElement>('.title-loop__silhouette');
  let index = Math.floor(Math.random() * ITEM_SETS.length);
  let timer: ReturnType<typeof setInterval> | undefined;

  const swap = (): void => {
    if (!silhouette) return;
    index = (index + 1) % ITEM_SETS.length;
    silhouette.innerHTML = SHAPES[ITEM_SETS[index]!];
  };

  swap();

  /*
   * Bei „Bewegung reduzieren" läuft kein Intervall: Es bleibt bei einer Silhouette, und
   * die CSS-Animation des Koffers ist über die Media-Query ohnehin aus. So gibt es dann
   * auch nichts, was zehn Minuten lang lecken könnte.
   */
  if (!prefersReducedMotion()) {
    timer = globalThis.setInterval(swap, SWAP_MS);
  }

  return {
    el,

    destroy() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      el.remove();
    },
  };
}
