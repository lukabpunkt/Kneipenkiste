/**
 * Title-Screen (GDD §5, Screen 0).
 *
 * Logo mit sich drehendem Zahlenrad, drei Buttons, Sound-Toggle — und hinter allem der
 * Loop aus GDD §5: Ein Crook schleicht durchs Bild, der Spotlight wandert ihm entgegen
 * und erwischt ihn. Er erstarrt, schaut ertappt heraus und macht sich aus dem Staub.
 *
 * Der Loop ist **reines DOM plus CSS** (CLAUDE.md: Menues sind DOM). PixiJS fuer eine
 * Silhouette zu starten waere die teuerste Animation im Spiel — und der Title-Screen ist
 * genau der, auf dem das Handy noch nichts geladen hat.
 *
 * Hier passiert ausserdem der **Audio-Unlock**: Mobile Browser erlauben Ton erst nach
 * einer echten Nutzergeste. Der erste Tap auf "Spielen" ist diese Geste.
 */

import { STORAGE_KEY_DISCLAIMER } from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton, setButtonLabel } from '@/ui/components/button';
import { openSheet } from '@/ui/components/sheet';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';
import { createRulesSheet } from './RulesSheet';
import { createSettingsSheet } from './SettingsSheet';
import doorSvg from '../../../assets-src/svg/dom/vault-door.svg?raw';
import crookSvg from '../../../assets-src/svg/dom/crook-sneak.svg?raw';

/** Merkt sich, dass der 18+-Hinweis schon einmal quittiert wurde. */
function disclaimerSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY_DISCLAIMER) === '1';
  } catch {
    return false;
  }
}

function markDisclaimerSeen(): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY_DISCLAIMER, '1');
  } catch {
    // Private Mode: Dann sieht man den Hinweis eben jedes Mal.
  }
}

export function createTitleScreen(ctx: ScreenContext): ScreenInstance {
  const el = document.createElement('section');
  el.className = 'screen screen--title';

  /*
   * Der Loop liegt hinter allem und ist fuer Screenreader unsichtbar: Er erzaehlt nichts,
   * was nicht auch im Text steht (Audit A5).
   */
  const loop = document.createElement('div');
  loop.className = 'titleLoop';
  loop.setAttribute('aria-hidden', 'true');

  const spot = document.createElement('div');
  spot.className = 'titleLoop__spot';

  const sneak = document.createElement('div');
  sneak.className = 'titleLoop__crook';
  sneak.innerHTML = crookSvg;

  loop.append(spot, sneak);

  const logo = document.createElement('div');
  logo.className = 'title__mark';
  logo.innerHTML = doorSvg;
  logo.setAttribute('aria-hidden', 'true');

  const heading = document.createElement('h1');
  heading.className = 'title__logo';
  heading.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.className = 'title__tagline';
  tagline.textContent = t('app.tagline');

  const actions = document.createElement('div');
  actions.className = 'title__actions';

  const play = createButton({
    label: t('title.play'),
    variant: 'primary',
    className: 'btn--block',
    wobble: true,
    onClick: () => {
      vibrate('tap');
      if (disclaimerSeen()) {
        void toLobby();
        return;
      }
      showDisclaimer();
    },
  });

  const rules = createButton({
    label: t('title.rules'),
    variant: 'secondary',
    className: 'btn--block',
    onClick: () => createRulesSheet(ctx.session.state.settings),
  });

  const settings = createButton({
    label: t('title.settings'),
    variant: 'secondary',
    className: 'btn--block',
    onClick: () => createSettingsSheet(ctx),
  });

  actions.append(play, rules, settings);

  const soundLabel = (): string =>
    `${t('title.sound')}: ${ctx.session.state.settings.sound ? t('common.on') : t('common.off')}`;

  const sound = createButton({
    label: soundLabel(),
    variant: 'ghost',
    className: 'title__sound',
    onClick: () => {
      ctx.session.setSettings({ sound: !ctx.session.state.settings.sound });
      setButtonLabel(sound, soundLabel());
    },
  });

  const version = document.createElement('p');
  version.className = 'title__version';
  version.textContent = `v${__APP_VERSION__}`;

  el.append(loop, logo, heading, tagline, actions, sound, version);

  async function toLobby(): Promise<void> {
    ctx.fsm.send({ type: 'start' });
    await ctx.router.go('lobby');
  }

  /** Einmaliger 18+-Hinweis (Roadmap M1.2). */
  function showDisclaimer(): void {
    const content = document.createElement('div');
    content.className = 'confirm';

    const body = document.createElement('p');
    body.className = 'confirm__body';
    body.textContent = t('title.disclaimer');

    const actionRow = document.createElement('div');
    actionRow.className = 'confirm__actions';

    const ok = createButton({
      label: t('common.confirm'),
      variant: 'primary',
      onClick: () => {
        markDisclaimerSeen();
        sheet.close();
        void toLobby();
      },
    });

    actionRow.append(ok);
    content.append(body, actionRow);

    const sheet = openSheet({
      title: t('app.title'),
      content,
      className: 'sheet__panel--compact',
    });
  }

  return {
    el,
    activate() {
      play.focus({ preventScroll: true });
    },
  };
}
