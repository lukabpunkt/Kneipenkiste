/**
 * Einstiegspunkt.
 *
 * In M0 gibt es noch keinen Router und keine Screens (Roadmap M1) — die App bootet die
 * Session, setzt die Sprache und zeigt den Titel, damit "Titel auf Handy" und die
 * PWA-Installation aus Audit A0 pruefbar sind. Ab M1 uebernimmt hier `ui/router.ts`.
 */

import './styles/tokens.css';
import './styles/base.css';

import { detectLocale, setLocale, t } from '@/core/i18n';
import { createSessionStore } from '@/core/session';

declare const __APP_VERSION__: string;

setLocale(detectLocale());

/** Alle `data-i18n`-Knoten im statischen HTML (Landscape-Overlay). */
function translateStaticNodes(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset['i18n'];
    if (key) node.textContent = t(key);
  }
}

function renderBootScreen(host: HTMLElement): void {
  host.replaceChildren();

  const screen = document.createElement('div');
  screen.className = 'boot';

  const logo = document.createElement('h1');
  logo.className = 'boot__logo';
  logo.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.className = 'boot__tagline';
  tagline.textContent = t('app.tagline');

  const version = document.createElement('p');
  version.className = 'boot__version';
  version.textContent = `v${__APP_VERSION__}`;

  screen.append(logo, tagline, version);
  host.append(screen);
}

const host = document.querySelector<HTMLElement>('#app');
if (!host) throw new Error('#app fehlt in index.html.');

// Die Session wird schon hier geladen: Wer die App neu startet, findet seine Runde wieder.
const session = createSessionStore();
setLocale(session.state.settings.locale);

translateStaticNodes();
renderBootScreen(host);
