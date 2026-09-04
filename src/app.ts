/**
 * Verdrahtung: FSM, Session, Router.
 *
 * Die FSM entscheidet, der Router zeigt. Es gibt genau **einen** Weg von einem State zu
 * einem Screen (`SCREEN_FOR_STATE`) — kein Screen navigiert selbst irgendwohin, sonst
 * laufen Spielzustand und Anzeige irgendwann auseinander.
 */

import { createFsm, type GameState } from '@/core/fsm';
import { createSeededRng } from '@/core/rng';
import { setLocale } from '@/core/i18n';
import {
  createSessionController,
  defaultPlayers,
  emptySession,
  loadSession,
  type SessionController,
} from '@/core/session';
import { detectLocale, t } from '@/core/i18n';
import { maxAmount } from '@/core/modes';
import { packView, publicView, resultView } from '@/core/publicView';
import { createDevPanel, devSeed, isDevMode } from '@/dev/devPanel';
import { confirmDialog } from '@/ui/components/sheet';
import { setHapticsEnabled } from '@/ui/haptics';
import { SCREEN_FOR_STATE, createRouter, type ScreenId } from '@/ui/router';
import { acquireWakeLock, releaseWakeLock, watchWakeLock } from '@/ui/wakeLock';
import { createDistributeScreen } from '@/ui/screens/DistributeScreen';
import { createGateScreen } from '@/ui/screens/GateScreen';
import { createHallScreen } from '@/ui/screens/HallScreen';
import { createInspectScreen } from '@/ui/screens/InspectScreen';
import { createLobbyScreen } from '@/ui/screens/LobbyScreen';
import { createOfficerIntroScreen } from '@/ui/screens/OfficerIntroScreen';
import { createPackScreen } from '@/ui/screens/PackScreen';
import { createPackedScreen } from '@/ui/screens/PackedScreen';
import { createPassScreen } from '@/ui/screens/PassScreen';
import { createResultScreen } from '@/ui/screens/ResultScreen';
import { createTitleScreen } from '@/ui/screens/TitleScreen';

/** Screens, bei denen das Handy in der Mitte liegt und nicht dunkel werden darf. */
const PUBLIC_STATES: readonly GameState[] = ['HALL', 'INSPECT', 'GATE', 'DISTRIBUTE'];

export interface App {
  session: SessionController;
  destroy(): void;
}

export function createApp(host: HTMLElement): App {
  const stored = loadSession();
  const session = createSessionController(stored ?? emptySession(defaultPlayers(5)));

  /*
   * Eine gespeicherte Sprache gewinnt, eine frische Session folgt dem Browser. Ohne die
   * zweite Haelfte startet jeder neue Spieler auf Deutsch, egal welches Geraet.
   */
  if (!stored) session.setSettings({ locale: detectLocale() });
  setLocale(session.settings().locale);
  setHapticsEnabled(session.settings().haptics);

  const dev = isDevMode();
  const seed = devSeed();

  const fsm = createFsm({
    players: [...session.players()],
    modes: { ...session.settings().modes },
    /* Nur im Dev-Build; produktiv bleibt es beim sicheren Zufall. */
    ...(seed === null ? {} : { rng: createSeededRng(seed) }),
  });

  /*
   * Hier — und nur hier — wird aus dem privaten Rundenzustand das, was ein Screen sehen
   * darf. Diese drei Funktionen sind die Schleuse (Architektur §4).
   */
  const router = createRouter({
    host,
    context: {
      fsm,
      session,
      dev,
      abortRound: () => askToAbort(),
      view: (phase) => publicView(requireRound(), phase),
      ownPack: (playerId) => packView(requireRound(), playerId, maxAmount(fsm.context.modes)),
      reveal: () => {
        const result = fsm.context.result;
        if (!result) throw new Error('Die Runde ist noch nicht abgerechnet.');
        return resultView(result);
      },
    },
  });

  function requireRound() {
    const round = fsm.context.round;
    if (!round) throw new Error('Keine laufende Runde.');
    return round;
  }

  router.register('title', createTitleScreen);
  router.register('lobby', createLobbyScreen);
  router.register('officerIntro', createOfficerIntroScreen);
  router.register('pass', createPassScreen);
  router.register('pack', createPackScreen);
  router.register('packed', createPackedScreen);
  router.register('hall', createHallScreen);
  router.register('inspect', createInspectScreen);
  router.register('gate', createGateScreen);
  router.register('distribute', createDistributeScreen);
  router.register('result', createResultScreen);

  function askToAbort(): void {
    if (!fsm.can('cancel')) return;
    confirmDialog(host, {
      title: t('backDialog.headline'),
      body: t('backDialog.body'),
      confirmLabel: t('backDialog.confirm'),
      dismissLabel: t('backDialog.dismiss'),
      onConfirm: () => fsm.send({ type: 'cancel' }),
    });
  }

  /* --- FSM → Router --- */

  const show = (state: GameState): void => {
    void router.go(SCREEN_FOR_STATE[state] as ScreenId);
  };

  const unsubscribe = fsm.subscribe((transition) => {
    /*
     * Die Runde ist durch: Statistik und Beamten-Rotation wandern in die Session, bevor
     * der Result-Screen sie liest.
     */
    if (transition.to === 'RESULT' && transition.from !== 'RESULT' && fsm.context.result) {
      session.recordRound(fsm.context.result);
    }

    if (PUBLIC_STATES.includes(transition.to)) void acquireWakeLock();
    else void releaseWakeLock();

    /* Selbstuebergaenge (INSPECT → INSPECT) tauschen keinen Screen. */
    if (transition.from === transition.to) return;
    show(transition.to);
  });

  const unwatch = watchWakeLock(() => PUBLIC_STATES.includes(fsm.state));

  /* --- Zurueck-Taste des Browsers = "Runde abbrechen?" --- */
  const onPopState = (): void => {
    askToAbort();
    history.pushState(null, '', location.href);
  };
  history.pushState(null, '', location.href);
  globalThis.addEventListener('popstate', onPopState);

  show(fsm.state);

  /*
   * Das Panel haengt **neben** dem Router-Host: `mount()` leert den Host bei jedem
   * Screenwechsel, und darin haette das Panel genau einen Screen lang ueberlebt.
   */
  const devPanel = dev ? createDevPanel(fsm) : null;
  if (devPanel) (host.parentElement ?? document.body).append(devPanel);

  return {
    session,
    destroy() {
      unsubscribe();
      unwatch();
      globalThis.removeEventListener('popstate', onPopState);
      devPanel?.remove();
      void releaseWakeLock();
    },
  };
}
