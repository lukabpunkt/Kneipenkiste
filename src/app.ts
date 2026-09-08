/**
 * Verdrahtung: FSM, Session, Router.
 *
 * Die FSM entscheidet, der Router zeigt. Es gibt genau **einen** Weg von einem State zu
 * einem Screen (`SCREEN_FOR_STATE`) — kein Screen navigiert selbst irgendwohin, sonst
 * laufen Spielzustand und Anzeige irgendwann auseinander.
 *
 * Und es gibt genau **eine** Schleuse an die Runde: die vier Projektionen unten. Alles,
 * was ein Screen über die laufende Runde weiß, kommt hier durch (Architektur §4).
 */

import {
  loadAudio,
  playMusic,
  preloadAudio,
  resumeAudio,
  setMusicVolume,
  setSoundEnabled,
  stopMusic,
  suspendAudio,
  unlockAudio,
} from '@/audio/AudioManager';
import { buildStepScript } from '@/core/choreographer';
import { createFsm, type GameState } from '@/core/fsm';
import { detectLocale, setLocale, t } from '@/core/i18n';
import { chooseView, publicView, resultView } from '@/core/publicView';
import { createSeededRng } from '@/core/rng';
import {
  createSessionController,
  defaultPlayers,
  emptySession,
  loadSession,
  type SessionController,
} from '@/core/session';
import { createDevPanel, devSeed, isDevMode, readStageStats } from '@/dev/devPanel';
import { createSequencePanel, isSequencePanel } from '@/dev/sequencePreview';
import { confirmDialog } from '@/ui/components/sheet';
import { setHapticsEnabled } from '@/ui/haptics';
import { SCREEN_FOR_STATE, createRouter, type ScreenId } from '@/ui/router';
import { acquireWakeLock, releaseWakeLock, watchWakeLock } from '@/ui/wakeLock';
import { createChooseScreen } from '@/ui/screens/ChooseScreen';
import { createDistributeScreen } from '@/ui/screens/DistributeScreen';
import { createLobbyScreen } from '@/ui/screens/LobbyScreen';
import { createNegotiationScreen } from '@/ui/screens/NegotiationScreen';
import { createPassScreen } from '@/ui/screens/PassScreen';
import { createResultScreen } from '@/ui/screens/ResultScreen';
import { createSealedScreen } from '@/ui/screens/SealedScreen';
import { createSilenceScreen } from '@/ui/screens/SilenceScreen';
import { createStepScreen } from '@/ui/screens/StepScreen';
import { createTitleScreen } from '@/ui/screens/TitleScreen';

/**
 * Screens, bei denen das Handy in der Mitte liegt oder herumgeht und nicht dunkel werden
 * darf. Die Absprache gehört dazu: 40 Sekunden reden reichen jedem Handy zum Einschlafen.
 */
/** In diesen States steht die PIXI-Buehne; ausserhalb wird sie abgeräumt. */
const STAGE_STATES: readonly GameState[] = ['STEP'];

const AWAKE_STATES: readonly GameState[] = [
  'NEGOTIATION',
  'SILENCE',
  'PASS',
  'CHOOSE',
  'SEALED',
  'STEP',
  'DISTRIBUTE',
];

export interface App {
  session: SessionController;
  destroy(): void;
}

export function createApp(host: HTMLElement): App {
  const stored = loadSession();
  const session = createSessionController(stored ?? emptySession(defaultPlayers(5)));

  /*
   * Eine gespeicherte Sprache gewinnt, eine frische Session folgt dem Browser. Ohne die
   * zweite Hälfte startet jeder neue Spieler auf Deutsch, egal welches Gerät.
   */
  if (!stored) session.setSettings({ locale: detectLocale() });
  setLocale(session.settings().locale);
  setHapticsEnabled(session.settings().haptics);
  setSoundEnabled(session.settings().sound);
  setMusicVolume(session.settings().music);
  preloadAudio();

  /*
   * iOS gibt Audio erst nach einer echten Nutzergeste frei — und die Geste muss
   * **synchron** im Event-Handler ankommen. Deshalb hier am Dokument und nicht in einem
   * Screen: Der erste Tap irgendwo entsperrt, egal welcher Screen gerade steht.
   */
  const unlockOnce = (): void => {
    unlockAudio();
    document.removeEventListener('pointerdown', unlockOnce, true);
  };
  document.addEventListener('pointerdown', unlockOnce, true);

  const dev = isDevMode();
  const seed = devSeed();

  const fsm = createFsm({
    players: [...session.players()],
    modes: { ...session.settings().modes },
    /* Nur im Dev-Build; produktiv bleibt es beim sicheren Zufall. */
    ...(seed === null ? {} : { rng: createSeededRng(seed) }),
  });

  /* Eine wiederhergestellte Session bringt ihre halb geschrumpfte Brücke mit (Audit A1). */
  fsm.hydrate({
    bridge: session.bridge(),
    ropeUsage: session.ropeUsage(),
    roundIndex: session.get().roundIndex,
  });

  function requireRound() {
    const round = fsm.context.round;
    if (!round) throw new Error('Keine laufende Runde.');
    return round;
  }

  function requireResult() {
    const result = fsm.context.result;
    if (!result) throw new Error('Die Runde ist noch nicht abgerechnet.');
    return result;
  }

  const router = createRouter({
    host,
    context: {
      fsm,
      session,
      dev,
      host,
      abortRound: () => askToAbort(),
      view: (phase) => publicView(requireRound(), phase),
      ownChoice: (playerId) => chooseView(requireRound(), playerId, fsm.context.ropeUsage),
      reveal: () => resultView(requireResult()),
      stepScript: () => buildStepScript(requireResult(), session.settings().pace),
    },
  });

  router.register('title', createTitleScreen);
  router.register('lobby', createLobbyScreen);
  router.register('negotiation', createNegotiationScreen);
  router.register('silence', createSilenceScreen);
  router.register('pass', createPassScreen);
  router.register('choose', createChooseScreen);
  router.register('sealed', createSealedScreen);
  router.register('step', createStepScreen);
  router.register('distribute', createDistributeScreen);
  router.register('result', createResultScreen);

  function askToAbort(): void {
    if (!fsm.can('cancel')) return;
    confirmDialog(host, {
      title: t('dialog.abortRound'),
      body: t('dialog.abortBody'),
      confirmLabel: t('common.confirm'),
      dismissLabel: t('common.cancel'),
      onConfirm: () => fsm.send({ type: 'cancel' }),
    });
  }

  /* --- FSM → Router --- */

  const show = (state: GameState): void => {
    void router.go(SCREEN_FOR_STATE[state] as ScreenId);
  };

  const unsubscribe = fsm.subscribe((transition) => {
    /*
     * Die Runde ist durch: Brücke, Seil-Verbrauch und Statistik wandern in die Session,
     * **bevor** der Result-Screen sie liest — und bevor `nextRound` die neue Runde baut.
     */
    if (transition.to === 'RESULT' && transition.from !== 'RESULT' && fsm.context.result) {
      session.recordRound(fsm.context.result);
    }

    /* Spielerwechsel in der Lobby: Die Session ist die Wahrheit, die FSM folgt. */
    if (transition.to === 'LOBBY') {
      fsm.setPlayers([...session.players()]);
    }

    if (AWAKE_STATES.includes(transition.to)) void acquireWakeLock();
    else void releaseWakeLock();

    /*
     * Zwanzig Sekunden Absprache sind genug Zeit für 250 KB Atlas. Wer erst beim Schritt
     * lädt, sieht einen Spinner an genau der Stelle, an der die Show anfangen sollte
     * (Roadmap M2.5).
     */
    if (transition.to === 'NEGOTIATION' || transition.to === 'SILENCE') {
      void import('@/game').then((game) => game.preloadStageAssets());
      void loadAudio();
    }

    /* Musik je Abschnitt — die Uhr tickt in der Absprache, der Drone im Schritt. */
    if (transition.to === 'LOBBY' || transition.to === 'TITLE') playMusic('music_lobby');
    else if (transition.to === 'NEGOTIATION' || transition.to === 'SILENCE') {
      playMusic('music_negotiation');
    } else if (transition.to === 'RESULT' || transition.to === 'DISTRIBUTE') stopMusic();

    /*
     * Die Bühne lebt nur während des Schritts. Sie danach abzuräumen ist kein Aufräumen
     * aus Ordnungsliebe: Ein PIXI-Ticker, der im Result weiterläuft, kostet auf einem
     * Handy spürbar Akku.
     */
    if (!STAGE_STATES.includes(transition.to)) {
      void import('@/game').then((game) => game.disposeStage());
    }

    /*
     * DISTRIBUTE → DISTRIBUTE ist der einzige Selbstübergang: Der nächste Verteiler ist
     * dran, der Screen aber derselbe. `go()` würde ihn für unverändert halten und den
     * alten stehen lassen — also neu aufbauen.
     *
     * Nur im Einzel-Modus. Der Schnellmodus führt die ganze Reihe in **einer** Komponente
     * und schickt seine Ereignisse am Stück; ein Neuaufbau dazwischen würde ihm mitten im
     * Durchgang die Pfeile unter den Händen wegziehen (ADR-5).
     */
    if (transition.from === transition.to) {
      if (transition.to === 'DISTRIBUTE' && fsm.context.distributeMode === 'iterate') {
        void router.refresh();
      }
      return;
    }

    show(transition.to);
  });

  const unwatch = watchWakeLock(() => AWAKE_STATES.includes(fsm.state));

  /* Im Hintergrund schweigt das Spiel — sonst tickt die Uhr in der Hosentasche weiter. */
  const onVisibility = (): void => {
    if (document.hidden) suspendAudio();
    else resumeAudio();
  };
  document.addEventListener('visibilitychange', onVisibility);

  /* --- Zurück-Taste des Browsers = "Runde abbrechen?" --- */
  const onPopState = (): void => {
    askToAbort();
    history.pushState(null, '', location.href);
  };
  history.pushState(null, '', location.href);
  globalThis.addEventListener('popstate', onPopState);

  show(fsm.state);

  /*
   * Das Panel hängt **neben** dem Router-Host: `mount()` leert den Host bei jedem
   * Screenwechsel, und darin hätte das Panel genau einen Screen lang überlebt.
   */
  const devPanel = dev
    ? createDevPanel(fsm, { refresh: () => void router.refresh(), stats: readStageStats })
    : null;
  if (devPanel) (host.parentElement ?? document.body).append(devPanel);

  /*
   * Der Sequenz-Preview hängt neben dem Router-Host, nicht darin: `mount()` leert den
   * Host bei jedem Screenwechsel, und die Show wechselt Screens.
   */
  const sequencePanel =
    dev && isSequencePanel()
      ? createSequencePanel(fsm, () => session.players().map((player) => player.id))
      : null;
  if (sequencePanel) (host.parentElement ?? document.body).append(sequencePanel);

  return {
    session,
    destroy() {
      unsubscribe();
      unwatch();
      stopMusic();
      suspendAudio();
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('pointerdown', unlockOnce, true);
      globalThis.removeEventListener('popstate', onPopState);
      devPanel?.remove();
      sequencePanel?.remove();
      void releaseWakeLock();
    },
  };
}
