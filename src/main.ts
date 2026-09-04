/**
 * Einstiegspunkt: Session laden, FSM bauen, Screens registrieren, los.
 *
 * Die Screens kennen einander nicht — sie schicken Events an die FSM und sagen dem
 * Router, wohin. Diese Datei ist der einzige Ort, der beides zusammenbringt.
 */

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';

import { createFsm } from '@/core/fsm';
import { detectLocale, setLocale, t } from '@/core/i18n';
import { createSessionStore } from '@/core/session';
import { confirmSheet } from '@/ui/components/sheet';
import { showToast } from '@/ui/components/toast';
import { setHapticsEnabled } from '@/ui/haptics';
import { createRouter, type ScreenId } from '@/ui/router';
import { watchWakeLock } from '@/ui/wakeLock';
import { createChoiceScreen } from '@/ui/screens/ChoiceScreen';
import { createDistributeScreen } from '@/ui/screens/DistributeScreen';
import { createLobbyScreen } from '@/ui/screens/LobbyScreen';
import { createNegotiationScreen } from '@/ui/screens/NegotiationScreen';
import { createPassScreen } from '@/ui/screens/PassScreen';
import { createResultScreen } from '@/ui/screens/ResultScreen';
import { createRevealScreen } from '@/ui/screens/RevealScreen';
import { createSealedScreen } from '@/ui/screens/SealedScreen';
import { createSilenceScreen } from '@/ui/screens/SilenceScreen';
import { createTitleScreen } from '@/ui/screens/TitleScreen';

/** Aus diesen Screens fuehrt der Zurueck-Knopf nur ueber einen Dialog (Architektur §3). */
const ABORTABLE: readonly ScreenId[] = ['negotiation', 'silence', 'pass', 'choice', 'sealed', 'reveal'];

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

  /*
   * `npm run preview:outcomes` haengt die Inszenierungs-Preview neben Router und FSM
   * (Roadmap M4.1). Sie liegt in einem eigenen Chunk und wird nur hier geladen — die
   * ausgelieferte App kennt sie nicht.
   */
  const params = new URLSearchParams(location.search);
  if (params.has('dev') && params.get('panel') === 'outcomes') {
    setLocale(createSessionStore().state.settings.locale ?? detectLocale());
    void import('@/ui/dev/outcomePreview').then(({ mountOutcomePreview }) =>
      mountOutcomePreview(mount)
    );
    return;
  }

  const session = createSessionStore();
  const settings = session.state.settings;

  setLocale(settings.locale ?? detectLocale());
  setHapticsEnabled(settings.haptics);
  applyStaticTranslations();

  const fsm = createFsm({
    players: [...session.state.players],
    settings,
    vault: session.state.vault,
  });

  /*
   * Die Session ist die Buchhaltung, die FSM der Spielverlauf. Genau ein Ort verbindet
   * sie: Sobald eine Runde durch ist, wandert das Ergebnis in die Historie — bei
   * `soloSteal` erst nach der Verteilung, sonst waere die Zeile unvollstaendig.
   */
  fsm.subscribe(({ to, event, context }) => {
    if (to !== 'RESULT' || !context.result) return;
    if (event.type === 'payout' || context.result.outcome !== 'soloSteal') {
      session.recordRound(context.result);
    }
  });

  const router = createRouter({
    host: mount,
    context: { fsm, session, dev: new URLSearchParams(location.search).has('dev') },
  });

  router.register('title', createTitleScreen);
  router.register('lobby', createLobbyScreen);
  router.register('negotiation', createNegotiationScreen);
  router.register('silence', createSilenceScreen);
  router.register('pass', createPassScreen);
  router.register('choice', createChoiceScreen);
  router.register('sealed', createSealedScreen);
  router.register('reveal', createRevealScreen);
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
  history.pushState({ tresor: true }, '');

  globalThis.addEventListener('popstate', () => {
    history.pushState({ tresor: true }, '');

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
