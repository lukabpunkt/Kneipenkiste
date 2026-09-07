/**
 * Title (GDD §5, Screen 0).
 *
 * Logo, ein Satz Erklaerung, drei Knoepfe — und der grabende Digger, der regelmaessig
 * aus dem Bild fliegt (`titleLoop.ts`). Die Schleife ist DOM, nicht PIXI: Der Titel ist
 * der erste Screen, und ein Renderer im Einstiegs-Chunk kostet Startzeit fuer etwas,
 * das nur nett aussieht (Architektur §1).
 */

import { STORAGE_KEY_DISCLAIMER } from '@/config/rules';
import { t } from '@/core/i18n';
import { createButton } from '@/ui/components/button';
import { createTitleLoop } from '@/ui/components/titleLoop';
import { openRulesSheet } from '@/ui/screens/RulesSheet';
import { openSettingsSheet } from '@/ui/screens/SettingsSheet';
import type { ScreenFactory } from '@/ui/router';

export const createTitleScreen: ScreenFactory = ({ fsm, router, session }) => {
  const el = document.createElement('section');
  el.className = 'screen screen--title';

  const logo = document.createElement('h1');
  logo.className = 'title__logo';
  /*
   * Der Dynamitstange-als-i-Punkt aus der Art Direction braucht den Atlas (M2). Bis
   * dahin traegt das Wort selbst den Look — Luckiest Guy mit ink-Kontur.
   */
  logo.textContent = t('app.title');

  const loop = createTitleLoop();

  const tagline = document.createElement('p');
  tagline.className = 'title__tagline';
  tagline.textContent = t('app.tagline');

  const actions = document.createElement('div');
  actions.className = 'title__actions';

  const play = createButton({
    label: t('title.play'),
    variant: 'primary',
    wobble: true,
    onClick: () => {
      // Der Router folgt der FSM, nicht umgekehrt: Ohne `start` bliebe sie in TITLE,
      // und die Lobby koennte die Runde spaeter gar nicht eroeffnen.
      if (!fsm.send({ type: 'start' })) return;
      void router.go('lobby');
    },
  });

  const rules = createButton({
    label: t('title.rules'),
    variant: 'secondary',
    onClick: () => openRulesSheet(),
  });

  const settings = createButton({
    label: t('title.settings'),
    variant: 'ghost',
    onClick: () => openSettingsSheet({ session, onLocaleChange: () => void router.refresh() }),
  });

  actions.append(play, rules, settings);
  el.append(loop.el, logo, tagline, actions);

  // Einmaliger 18+-Hinweis (Roadmap M1.2). Er steht als Fussnote, nicht als Dialog —
  // ein Trinkspiel, das mit einem Modal beginnt, ist kein Zero-Friction-Spiel.
  let disclaimerSeen = true;
  try {
    disclaimerSeen = globalThis.localStorage?.getItem(STORAGE_KEY_DISCLAIMER) === '1';
  } catch {
    // Private Mode: Der Hinweis erscheint dann jedes Mal. Harmlos.
  }
  if (!disclaimerSeen) {
    const note = document.createElement('p');
    note.className = 'title__disclaimer';
    note.textContent = t('title.disclaimer');
    el.append(note);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY_DISCLAIMER, '1');
    } catch {
      // s. o.
    }
  }

  return {
    el,
    activate() {
      loop.start();
    },
    /*
     * Anhalten beim Verlassen: Sonst tickt der Timer weiter, solange die App laeuft —
     * Audit A5 prueft zehn Minuten Titel ohne Leck.
     */
    destroy() {
      loop.stop();
    },
  };
};
