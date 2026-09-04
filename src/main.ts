/**
 * Einstiegspunkt.
 *
 * M0 zeigt nur den Titel — genug, um die App auf dem Handy zu oeffnen und die PWA zu
 * installieren. Der Router und die echten Screens kommen in M1 (Roadmap M1.1/M1.2)
 * und ersetzen `renderTitle()` hier.
 */

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';

import { DEFAULT_SETTINGS } from '@/config/rules';
import { detectLocale, setLocale, t } from '@/core/i18n';
import { createSessionStore } from '@/core/session';
import { vaultSpec } from '@/core/vault';

function applyStaticTranslations(root: ParentNode = document): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset['i18n'];
    if (key) node.textContent = t(key);
  }
}

/** Platzhalter-Titelbild, bis M1 den Title-Screen baut. */
function renderTitle(mount: HTMLElement, vault: number): void {
  mount.innerHTML = '';

  const screen = document.createElement('div');
  screen.className = 'screen screen--title';

  const logo = document.createElement('h1');
  logo.className = 'title__logo';
  logo.textContent = t('app.title');

  const tagline = document.createElement('p');
  tagline.className = 'title__tagline';
  tagline.textContent = t('app.tagline');

  const vaultLine = document.createElement('p');
  vaultLine.className = 'title__vault';
  vaultLine.textContent = t('negotiation.vaultLine', { count: vault });

  const disclaimer = document.createElement('p');
  disclaimer.className = 'title__disclaimer';
  disclaimer.textContent = t('title.disclaimer');

  const version = document.createElement('p');
  version.className = 'title__version';
  version.textContent = `v${__APP_VERSION__}`;

  screen.append(logo, tagline, vaultLine, disclaimer, version);
  mount.append(screen);
}

function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

function boot(): void {
  const mount = document.querySelector<HTMLElement>('#app');
  if (!mount) throw new Error('#app fehlt in index.html.');

  const session = createSessionStore();
  setLocale(session.get().settings.locale ?? detectLocale());

  applyStaticTranslations();
  renderTitle(mount, session.get().vault || vaultSpec(DEFAULT_SETTINGS).startVault);
  registerServiceWorker();
}

boot();
