/**
 * Title (GDD §5, Screen 0).
 *
 * Der Loop — ein Hiker geht über die Brücke, ein Balken bricht, er fällt und kommt nass
 * wieder hoch — kommt in M5. Hier steht schon die Aussage: eine Brücke, eine Lücke, und
 * darunter viel Luft.
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
  <circle cx="160" cy="72" r="11" fill="var(--player-red)" stroke="var(--ink)" stroke-width="4" />
  <path d="M18 118q60 -14 130 0t154 -6" stroke="var(--mist)" stroke-width="11" stroke-linecap="round" fill="none" opacity="0.32" />
  <path d="M40 132q70 -10 120 2t130 -8" stroke="var(--mist)" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.2" />
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
