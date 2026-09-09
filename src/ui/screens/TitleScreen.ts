/**
 * Title (GDD §5, Screen 0).
 *
 * Der Loop erzählt das ganze Spiel in neun Sekunden: Einer geht über die Brücke, der
 * Balken unter ihm bricht, er fällt in den Nebel — und klettert wieder hoch. Wer das
 * einmal gesehen hat, braucht die Regeln nicht mehr erklärt zu bekommen.
 *
 * Er läuft in **CSS**, nicht in JavaScript: kein Timer, kein `requestAnimationFrame`,
 * nichts, was aufgeräumt werden müsste. Der Titel steht auf einem Handy schon mal zehn
 * Minuten offen, während die Runde sich sortiert (Audit A5) — ein Loop, der dabei
 * Speicher sammelt, wäre der dümmste denkbare Leak. Alle Teilbewegungen hängen an
 * derselben Dauer (`--title-loop-ms`), deshalb können sie nicht auseinanderlaufen; bei
 * „Bewegung reduzieren" steht die Dauer auf 0 und das Bild einfach still.
 */

import { t } from '@/core/i18n';
import { createButton } from '../components/button';
import { openRulesSheet } from './RulesSheet';
import { openSettingsSheet } from './SettingsSheet';
import type { ScreenContext, ScreenInstance } from '../router';

export function createTitleScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--title';

  const art = document.createElement('div');
  art.className = 'title__art';
  art.setAttribute('aria-hidden', 'true');
  art.innerHTML = `
<svg viewBox="0 0 320 150" class="title__bridge" focusable="false">
  <path d="M14 34C90 92 230 92 306 34" fill="none" stroke="var(--ink)" stroke-width="9" stroke-linecap="round" />
  <path d="M14 34C90 92 230 92 306 34" fill="none" stroke="var(--rope)" stroke-width="5" stroke-linecap="round" />
  <g class="title__planks" fill="var(--wood)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round">
    <rect x="52" y="52" width="34" height="12" rx="4" transform="rotate(11 69 58)" />
    <rect x="96" y="66" width="34" height="12" rx="4" transform="rotate(6 113 72)" />
    <rect x="188" y="70" width="34" height="12" rx="4" transform="rotate(-6 205 76)" />
    <rect x="232" y="56" width="34" height="12" rx="4" transform="rotate(-11 249 62)" />
  </g>
  <path d="M18 118q60 -14 130 0t154 -6" stroke="var(--mist)" stroke-width="11" stroke-linecap="round" fill="none" opacity="0.32" />
  <path d="M40 132q70 -10 120 2t130 -8" stroke="var(--mist)" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.2" />
  <circle class="title__splash" cx="160" cy="128" r="12" fill="none" stroke="var(--mist)" stroke-width="3" />
  <rect class="title__plank-doomed" x="143" y="71" width="34" height="12" rx="4"
        fill="var(--wood)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
  <g class="title__hiker">
    <path d="M-5 9l-3 7M5 9l3 7" stroke="var(--rope)" stroke-width="4" stroke-linecap="round" fill="none" />
    <circle r="11" fill="var(--player-red)" stroke="var(--paper)" stroke-width="2.5" />
    <path d="M-7 -9q7 -10 14 0" fill="var(--rope)" />
    <path d="M-15 -9h30" stroke="var(--rope)" stroke-width="4.5" stroke-linecap="round" fill="none" />
  </g>
</svg>`;

  const heading = document.createElement('h1');
  heading.className = 'title__logo';
  heading.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.className = 'title__tagline';
  tagline.textContent = t('app.tagline');

  const actions = document.createElement('div');
  actions.className = 'title__actions';
  actions.append(
    createButton({
      label: t('title.play'),
      variant: 'primary',
      onClick: () => ctx.fsm.send({ type: 'start' }),
    }),
    createButton({
      label: t('title.rules'),
      variant: 'secondary',
      onClick: () => openRulesSheet(ctx.host),
    }),
    createButton({
      label: t('title.settings'),
      variant: 'ghost',
      onClick: () => openSettingsSheet(ctx.host, ctx),
    })
  );

  el.append(art, heading, tagline, actions);
  return { el };
}
