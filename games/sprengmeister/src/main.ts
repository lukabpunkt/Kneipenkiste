/**
 * Einstiegspunkt: Session laden, FSM bauen, Screens registrieren, los.
 *
 * Die Screens kennen einander nicht — sie schicken Events an die FSM und sagen dem
 * Router, wohin. Diese Datei ist der einzige Ort, der beides zusammenbringt.
 */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { createFsm } from '@/core/fsm';
import { detectLocale, setLocale, t } from '@/core/i18n';
import { createSessionStore } from '@/core/session';
import { setAudioEnabled, setMusicVolume, suspendAudio, resumeAudio } from '@/audio/AudioManager';
import { installAudioUnlock, updateSoundtrack } from '@/audio/soundtrack';
import { confirmSheet } from '@/ui/components/sheet';
import { showToast } from '@/ui/components/toast';
import { secureSource } from '@/ui/devSeed';
import { setHapticsEnabled } from '@/ui/haptics';
import { createRouter, type ScreenId } from '@/ui/router';
import { watchWakeLock } from '@/ui/wakeLock';
import { createBuriedScreen } from '@/ui/screens/BuriedScreen';
import { createDigScreen } from '@/ui/screens/DigScreen';
import { createDistributeScreen } from '@/ui/screens/DistributeScreen';
import { createLobbyScreen } from '@/ui/screens/LobbyScreen';
import { createPassScreen } from '@/ui/screens/PassScreen';
import { createPlaceScreen } from '@/ui/screens/PlaceScreen';
import { createResultScreen } from '@/ui/screens/ResultScreen';
import { createTitleScreen } from '@/ui/screens/TitleScreen';

/** Aus diesen Screens fuehrt der Zurueck-Knopf nur ueber einen Dialog (Architektur §3). */
const ABORTABLE: readonly ScreenId[] = ['pass', 'place', 'buried', 'dig'];

function applyStaticTranslations(root: ParentNode = document): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset['i18n'];
    if (key) node.textContent = t(key);
  }
}

function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        showToast(t('app.title'), {
          durationMs: 8000,
          action: { label: t('common.continue'), onClick: () => void update(true) },
        });
      },
    });
  });
}

function boot(): void {
  const mount = document.querySelector<HTMLElement>('#app');
  if (!mount) throw new Error('#app fehlt in index.html.');

  const session = createSessionStore();
  const settings = session.state.settings;

  setLocale(settings.locale ?? detectLocale());
  setHapticsEnabled(settings.haptics);
  setAudioEnabled(settings.sound);
  setMusicVolume(settings.music);
  applyStaticTranslations();

  const fsm = createFsm({
    players: [...session.state.players],
    settings,
    // Produktiv `crypto.getRandomValues`; nur im Dev- und E2E-Build kann `?seed=`
    // eine reproduzierbare Quelle einsetzen (siehe ui/devSeed.ts).
    secure: secureSource(),
  });

  /*
   * Die Session ist die Buchhaltung, die FSM der Spielverlauf. Genau ein Ort verbindet
   * sie: Sobald eine Runde im Result angekommen ist, wandert sie in die Historie —
   * mit Verteilung, falls es eine gab, sonst waere die Zeile unvollstaendig.
   */
  fsm.subscribe(({ to, context }) => {
    if (to !== 'RESULT' || !context.result) return;
    session.recordRound(context.result);
  });

  const router = createRouter({
    host: mount,
    context: { fsm, session, dev: new URLSearchParams(location.search).has('dev') },
    onNavigate: (screen) => updateSoundtrack(screen),
  });

  /*
   * Ton gibt es erst nach einer echten Nutzergeste (iOS) — bis dahin ist der Loop nur
   * vorgemerkt. `installAudioUnlock` holt ihn beim ersten Tap nach.
   */
  installAudioUnlock(() => router.current);

  /*
   * Beim Tab-Wechsel wird der AudioContext angehalten: Ein Loop, der in einem
   * weggelegten Tab weiterspielt, ist auf dem Handy ein Fehler, kein Feature.
   */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendAudio();
    else resumeAudio();
  });

  router.register('title', createTitleScreen);
  router.register('lobby', createLobbyScreen);
  router.register('pass', createPassScreen);
  router.register('place', createPlaceScreen);
  router.register('buried', createBuriedScreen);
  router.register('dig', createDigScreen);
  router.register('distribute', createDistributeScreen);
  router.register('result', createResultScreen);

  setupBackButton(router, () => {
    if (!fsm.send({ type: 'cancel' })) return;
    void router.go('lobby', { direction: 'back' });
  });

  watchWakeLock();
  registerServiceWorker();

  void router.go('title');
}

/**
 * Zurueck-Knopf des Browsers abfangen (Architektur §3).
 *
 * Ein versehentlicher Wisch darf keine laufende Runde wegwerfen — und ohne
 * History-Eintrag verlaesst er die App komplett. Deshalb ein Dummy-Eintrag, der nach
 * jedem `popstate` sofort wieder nachgeschoben wird.
 */
function setupBackButton(router: { current: ScreenId | null }, abort: () => void): void {
  history.pushState({ sprengmeister: true }, '');

  globalThis.addEventListener('popstate', () => {
    history.pushState({ sprengmeister: true }, '');

    const current = router.current;
    if (current === null || !ABORTABLE.includes(current)) return;

    void confirmSheet({
      title: t('dialog.abortRound'),
      body: t('dialog.abortRoundBody'),
      confirmLabel: t('dialog.abortConfirm'),
      cancelLabel: t('dialog.abortKeep'),
    }).then((confirmed) => {
      if (confirmed) abort();
    });
  });
}

boot();
