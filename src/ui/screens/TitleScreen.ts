/**
 * Titel (GDD §5, Screen 0).
 *
 * M1: Logo im Stempel-Look, drei Knoepfe. Der Koffer, der im Loop durchs Roentgen rollt,
 * kommt in M5 — bis dahin steht hier eine ruhige Version, die niemanden anluegt.
 */

import { t } from '@/core/i18n';
import { createButton } from '../components/button';
import { openRulesSheet } from './RulesSheet';
import { openSettingsSheet } from './SettingsSheet';
import type { ScreenContext, ScreenInstance } from '../router';

export function createTitleScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('main');
  el.className = 'screen screen--title';

  const logo = document.createElement('h1');
  logo.className = 'title__logo';
  logo.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.className = 'title__tagline';
  tagline.textContent = t('app.tagline');

  const actions = document.createElement('div');
  actions.className = 'title__actions';

  actions.append(
    createButton({
      label: t('title.play'),
      variant: 'primary',
      onClick: () => {
        ctx.fsm.send({ type: 'start' });
      },
    }),
    createButton({
      label: t('title.rules'),
      variant: 'secondary',
      onClick: () => openRulesSheet(el),
    }),
    createButton({
      label: t('title.settings'),
      variant: 'ghost',
      onClick: () => openSettingsSheet(el, ctx),
    })
  );

  el.append(logo, tagline, actions);

  return { el };
}
