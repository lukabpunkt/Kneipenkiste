/**
 * Einstiegspunkt.
 *
 * M0 zeigt nur den Titel — der komplette Screen-Flow kommt in M1 (Roadmap).
 * Was hier bereits steht: i18n, Settings, Session-Persistenz und die FSM, damit ab M1
 * nur noch der Router dazwischenhaengt.
 */

import '@/styles/tokens.css';
import '@/styles/base.css';

import { DEFAULT_SETTINGS } from '@/config/rules';
import { createFsm } from '@/core/fsm';
import { detectLocale, setLocale, t } from '@/core/i18n';
import { loadSession } from '@/core/session';

/** Fortsetzbare Session aus dem localStorage — ab M1 fuellt sie die Lobby vor. */
const resumable = loadSession();

declare const __APP_VERSION__: string;

function applyStaticTranslations(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  }
}

function renderTitle(root: HTMLElement): void {
  root.innerHTML = '';

  const screen = document.createElement('main');
  screen.className = 'screen screen--title';

  const logo = document.createElement('h1');
  logo.className = 'title__logo';
  logo.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.className = 'title__tagline';
  tagline.textContent = t('app.tagline');

  const version = document.createElement('p');
  version.className = 'title__version';
  version.textContent = `v${__APP_VERSION__}`;

  screen.append(logo, tagline, version);
  root.append(screen);
}

function boot(): void {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app fehlt im Dokument.');

  /* Sprache aus dem Browser; ab M1 kann sie in den Settings ueberschrieben werden. */
  setLocale(detectLocale());

  applyStaticTranslations();
  renderTitle(root);

  /* Die FSM steht bereits — ab M1 haengt sich der Router als Hook ein. */
  const fsm = createFsm({
    modes: { ...DEFAULT_SETTINGS.modes },
    ...(resumable ? { players: resumable.players } : {}),
  });
  Reflect.set(globalThis, '__zoll', { fsm, version: __APP_VERSION__ });
}

boot();
