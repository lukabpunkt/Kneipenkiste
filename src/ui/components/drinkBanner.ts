/**
 * Trink-Banner und Kill-Feed (Art Direction §4.3).
 *
 * Die Schaerpe faehrt von rechts ein — "ANNA TRINKT 2" —, darunter der Kill-Feed
 * "Rudi → Anna" mit beiden Badges. Bleibt 2,2 s, dann raus.
 *
 * **Design-Prioritaet 2 (CLAUDE.md): Der Schuldige ist immer sichtbar.** Deshalb steht
 * der Kill-Feed im selben Element wie die Schluecke und erscheint mit ihm zusammen —
 * nie danach, nie irgendwo anders. Ab M2 kommt der Farbring ueber dem Krater dazu; die
 * Reihenfolge (Ring ≤ 300 ms nach der Explosion, dann der Gag) gehoert dann in den
 * `DigDirector`.
 */

import { BANNER } from '@/config/choreo';
import type { ColorId } from '@/config/theme';
import { t } from '@/core/i18n';
import { safeAnimate } from '@/ui/animate';
import { vibrate } from '@/ui/haptics';
import { createPlayerBadge } from './badge';

export interface KillLine {
  layerName: string;
  layerColor: ColorId;
  victimName: string;
  victimColor: ColorId;
}

export interface DrinkBannerOptions {
  /** Wer trinkt und wie viel. Ohne Schluecke (Blindgaenger) bleibt die Zeile weg. */
  drinker?: { name: string; sips: number };
  /** Eine Zeile je ausgeloester Mine — bei einem Stapel sind es zwei. */
  kills: readonly KillLine[];
  /** Ueberschreibt die Schluecke-Zeile, z. B. "DER PREIS DER GIER". */
  headline?: string;
  variant?: 'boom' | 'dud' | 'treasure';
  haptics?: boolean;
}

export interface BannerHost {
  el: HTMLElement;
  /** Zeigt ein Banner und loest auf, wenn es wieder weg ist. */
  show(options: DrinkBannerOptions): Promise<void>;
  clear(): void;
}

/**
 * Ein Host, in den nacheinander Banner laufen. Er haelt immer nur eines — waehrend
 * eines Banners ist das Feld ohnehin gesperrt.
 */
export function createBannerHost(): BannerHost {
  const el = document.createElement('div');
  el.className = 'banner-host';
  el.setAttribute('aria-live', 'assertive');
  el.setAttribute('role', 'status');

  return {
    el,

    async show(options) {
      el.replaceChildren();

      const banner = document.createElement('div');
      banner.className = `drink-banner drink-banner--${options.variant ?? 'boom'}`;

      const headline = document.createElement('p');
      headline.className = 'drink-banner__headline';
      headline.textContent =
        options.headline ??
        (options.drinker
          ? t('dig.drinks', { name: options.drinker.name.toUpperCase(), count: options.drinker.sips })
          : '');
      if (headline.textContent) banner.append(headline);

      if (options.kills.length > 0) {
        const feed = document.createElement('div');
        feed.className = 'drink-banner__feed';

        for (const kill of options.kills) {
          const line = document.createElement('div');
          line.className = 'kill-feed';
          line.append(createPlayerBadge({ colorId: kill.layerColor, size: 'sm' }));

          const text = document.createElement('span');
          text.className = 'kill-feed__text';
          text.textContent = t('dig.killFeed', { layer: kill.layerName, victim: kill.victimName });
          line.append(text);

          line.append(createPlayerBadge({ colorId: kill.victimColor, size: 'sm' }));
          feed.append(line);
        }
        banner.append(feed);
      }

      el.append(banner);

      if (options.haptics !== false) {
        if (options.variant === 'dud') vibrate('dud');
        else if (options.variant === 'treasure') vibrate('treasure');
        else vibrate(options.kills.length > 1 ? 'boomDouble' : 'boom');
      }

      await safeAnimate(
        banner,
        [
          { transform: 'translate3d(110%,0,0)', opacity: 0 },
          { transform: 'translate3d(0,0,0)', opacity: 1 },
        ],
        { duration: BANNER.drinkInMs, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' },
        { respectReducedMotion: false }
      );

      await new Promise((resolve) => globalThis.setTimeout(resolve, BANNER.drinkHoldMs));

      await safeAnimate(
        banner,
        [
          { transform: 'translate3d(0,0,0)', opacity: 1 },
          { transform: 'translate3d(110%,0,0)', opacity: 0 },
        ],
        { duration: BANNER.drinkOutMs, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
        { respectReducedMotion: false }
      );

      banner.remove();
    },

    clear() {
      el.replaceChildren();
    },
  };
}
