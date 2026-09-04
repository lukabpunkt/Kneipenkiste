/**
 * Aufdeckung — die PIXI-Buehne (Roadmap M2).
 *
 * Der Tresorraum steht: Wand, Laser, Tresor, Samttisch, Crooks im Halbkreis hinter ihren
 * Karten, Herr Kassel daneben. Die **Show** — Tempo-Kurve, Stalls, Slow-Mo, Kamerafahrten —
 * baut M3 als `RevealDirector` darauf auf. Hier laeuft noch der Platzhalter-Takt aus M1:
 * eine Karte pro Sekunde.
 *
 * Zwei Dinge sind aber schon jetzt richtig, weil sie Gesetz sind (CLAUDE.md):
 *
 * 1. Die Reihenfolge kommt aus `result.revealOrder` — Teiler zuerst, Diebe zuletzt,
 *    Maulwurf als letzter Dieb.
 * 2. Tap-to-Skip gilt ab der zweiten Karte und **nie** bei der letzten.
 *
 * Faellt PIXI aus — kein WebGL, Atlas kaputt, Speicher voll —, uebernimmt die
 * DOM-Kartenreihe aus M1. Ein Trinkspiel darf nicht am Renderer sterben.
 */

import { SKIP_FROM_CARD_INDEX, STALLS_LAST, STALLS_NORMAL } from '@/config/choreo';
import { colorById, hex, textColorOn } from '@/config/theme';
import { t } from '@/core/i18n';
import { createSeededRng } from '@/core/rng';
import type { Choice, RoundResult } from '@/core/types';
import { createDevPanel, type DevPanel } from '@/ui/components/devPanel';
import { vaultFill } from '@/ui/components/vaultWidget';
import { symbolSvg } from '@/ui/components/badge';
import { vaultSpec } from '@/core/vault';
import { vibrate } from '@/ui/haptics';
import type { ScreenContext, ScreenInstance } from '@/ui/router';
import { acquireWakeLock, releaseWakeLock } from '@/ui/wakeLock';
/*
 * Nur Typen — die Module selbst werden in `buildStage()` dynamisch geladen. PIXI und
 * GSAP machen zusammen rund 400 KB aus; im Einstiegs-Chunk waeren sie fuer jeden Screen
 * dabei, obwohl nur die Aufdeckung sie braucht (Architektur §1, ADR-15).
 */
import type { Camera } from '@/game/Camera';
import type { StageAppHandle } from '@/game/StageApp';
import type { VaultRoom } from '@/game/VaultRoom';

/** Nur mit `?dev=1`: Haelt den Auto-Takt an, damit man die Buehne betrachten kann. */
function holdMode(): boolean {
  const params = new URLSearchParams(location.search);
  return params.has('dev') && params.has('hold');
}

/** Abstand zwischen zwei Karten im Platzhalter-Takt (M3 ersetzt das durch die Kurve). */
const STEP_MS = 1000;
/** Die letzte Karte darf laenger stehen — sie ist der Moment. */
const LAST_CARD_MS = 1600;
/** Pause, bevor es zum Ergebnis geht. */
const OUTRO_MS = 900;

export function createRevealScreen(ctx: ScreenContext): ScreenInstance {
  const result = ctx.fsm.context.result;

  const el = document.createElement('section');
  el.className = 'screen screen--reveal';

  /*
   * Protokoll dessen, was die Buehne **tatsaechlich** aufgedeckt hat, als
   * `playerId:choice`-Liste. Das ist kein Debug-Rest, sondern die Pruefnaht fuer die
   * wichtigste Zusicherung des Spiels: gezeigte Karten == getroffene Wahlen, in der
   * Reihenfolge aus `revealOrder` (ADR-3, Audit A1/A3). Auf einer PIXI-Buehne gibt es
   * sonst nichts, woran ein Test das festmachen koennte.
   */
  el.dataset['revealed'] = '';

  const canvasHost = document.createElement('div');
  canvasHost.className = 'reveal__stage';
  canvasHost.setAttribute('aria-hidden', 'true');

  const hint = document.createElement('p');
  hint.className = 'reveal__hint';
  hint.textContent = t('reveal.skipHint');

  el.append(canvasHost, hint);

  if (!result) {
    // Kann nur passieren, wenn der Screen ohne Runde betreten wird (Reload mitten drin).
    return { el };
  }

  /* ---------------------------------------------------------------- */

  let stage: StageAppHandle | undefined;
  let room: VaultRoom | undefined;
  let camera: Camera | undefined;
  let tick: ((ticker: { deltaMS: number }) => void) | undefined;
  let devPanel: DevPanel | undefined;
  let destroyed = false;

  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;

  const order = result.revealOrder;
  const isLast = (i: number): boolean => i === order.length - 1;

  /** Deckt Karte `i` auf und plant die naechste. */
  const step = (): void => {
    if (destroyed || finished || index >= order.length) return;
    const playerId = order[index]!;
    const choice: Choice = result.choices[playerId] ?? 'share';
    const last = isLast(index);

    revealCard(playerId, choice, last);

    index += 1;
    timer = globalThis.setTimeout(index >= order.length ? finish : step, last ? LAST_CARD_MS : STEP_MS);
  };

  const finish = (): void => {
    if (finished) return;
    finished = true;
    hint.hidden = true;
    globalThis.setTimeout(() => {
      if (destroyed) return;
      if (!ctx.fsm.send({ type: 'showFinished' })) return;
      void ctx.router.go(ctx.fsm.state === 'DISTRIBUTE' ? 'distribute' : 'result');
    }, OUTRO_MS);
  };

  /**
   * Tap-to-Skip: Ab der zweiten Karte darf getippt werden, nie bei der letzten und nie
   * nach dem Ende (GDD §4.3). `index` zeigt auf die naechste Karte.
   */
  const onTap = (): void => {
    if (finished) return;
    const current = index - 1;
    if (current < SKIP_FROM_CARD_INDEX) return;
    if (isLast(current) || index >= order.length) return;
    if (timer !== undefined) clearTimeout(timer);
    step();
  };
  el.addEventListener('click', onTap);

  /* ---------------------------------------------------------------- */
  /* PIXI-Buehne                                                       */
  /* ---------------------------------------------------------------- */

  const domFallback = createDomFallback(ctx, result);

  async function buildStage(): Promise<boolean> {
    // Ein einziger Lazy-Chunk: Die drei Module haengen ohnehin aneinander.
    const [stageApp, roomModule, cameraModule] = await Promise.all([
      import('@/game/StageApp'),
      import('@/game/VaultRoom'),
      import('@/game/Camera'),
    ]);
    if (destroyed) return false;

    const assets = await stageApp.loadStageAssets();
    if (destroyed) return false;

    stage = await stageApp.getStageApp();
    if (destroyed) return false;

    stage.clearWorld();
    const rng = createSeededRng(result!.seed);
    const low = ctx.session.state.settings.lowEffects || stageApp.detectLowEffects();

    room = new roomModule.VaultRoom({ assets, rng, lowEffects: low });
    room.populate({
      players: ctx.session.state.players,
      choices: result!.choices,
      oaths: result!.oaths,
      vaultFill: vaultFill(result!.vault, vaultSpec(ctx.fsm.context.settings)),
    });

    stage.world.addChild(room.view);
    stage.overlay.addChild(room.light);
    camera = new cameraModule.Camera(room.view);

    stage.attach(canvasHost);

    tick = (ticker) => room?.update(ticker.deltaMS);
    stage.app.ticker.add(tick);

    // Der Tresor geht auf, Kassel bittet um die Karten (GDD §4.3, Intro).
    room.vault.openDoor();
    room.kassel.say(t('kassel.cardsPlease'));

    if (ctx.dev) mountDevPanel();

    /*
     * Zweiter Teil der Low-Effects-Regel: Wenn die ersten zwei Sekunden zu langsam
     * laufen, fliegen Laser, Schatten und Vignette raus (Architektur §9).
     */
    if (!low) {
      void stageApp.measureLowEffects(stage).then((slow) => {
        if (slow && !destroyed) room?.setLowEffects(true);
      });
    }
    return true;
  }

  /** Bedienfeld fuer den Look-Check (Roadmap M2.5). Nur bei `?dev=1`. */
  function mountDevPanel(): void {
    let flipIndex = 0;
    let lasersOn = true;

    devPanel = createDevPanel({
      actions: [
        { label: 'Tresor auf', onClick: () => room?.vault.openDoor() },
        { label: 'Tresor zu', onClick: () => room?.vault.closeDoor() },
        {
          label: 'Karte umdrehen',
          onClick: () => {
            const playerId = order[flipIndex % order.length];
            flipIndex += 1;
            if (!playerId) return;
            const last = flipIndex - 1 === order.length - 1;
            revealCard(playerId, result!.choices[playerId] ?? 'share', last);
          },
        },
        { label: 'Alarm', onClick: () => room?.raiseAlarm() },
        {
          // Die Sprechblase ist der teuerste Einzelteil der Buehne (ADR-16) — sie muss
          // sich im Perf-Test gezielt einschalten lassen.
          label: 'Kassel',
          onClick: () => room?.kassel.say(t('kassel.cardsPlease'), 6000),
        },
        {
          label: 'Low-Effects',
          onClick: () => {
            lasersOn = !lasersOn;
            room?.setLowEffects(!lasersOn);
          },
        },
        { label: 'Kamera zurueck', onClick: () => camera?.reset() },
      ],
      readStats: () => {
        const times = stage?.frameTimes() ?? [];
        const recent = times.slice(-60);
        const avg = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
        return {
          fps: avg > 0 ? Math.round(1000 / avg) : 0,
          'ms/frame': avg.toFixed(1),
          draws: stage?.drawCalls() ?? 0,
          crooks: room?.crooks.size ?? 0,
        };
      },
    });
    el.append(devPanel.el);
  }

  /** Dreht eine Karte um — auf der Buehne, oder im DOM-Notnagel. */
  function revealCard(playerId: string, choice: Choice, last: boolean): void {
    if (room) {
      const card = room.cards.get(playerId);
      const crook = room.crooks.get(playerId);

      /*
       * Bewusst **kein** Kamera-Zoom auf die Karte: Das ist Regie und gehoert in den
       * `RevealDirector` (M3), zusammen mit Tempo-Kurve und Slow-Mo. Hier bleibt die
       * Totale stehen — so sieht man, dass der ganze Halbkreis lebt, und genau das ist
       * die Frage, die M2 beantwortet.
       */
      room.lookAtCard(playerId);

      card?.lift();
      card?.flip(last ? STALLS_LAST : STALLS_NORMAL, last ? 0.6 : 1);

      // Blick-Regie: Der Besitzer zeigt erst NACH dem Flip sein Gesicht (Art Direction §7).
      globalThis.setTimeout(() => crook?.setFace(choice === 'steal' ? 'smug' : 'innocent'), last ? 900 : 520);

      if (last) {
        room.narrowSpot(0.6, 700);
        room.kassel.say(t(`kassel.${result!.outcome}`), 2200);
      }
      if (choice === 'steal') {
        room.raiseAlarm();
        camera?.shake();
      }
    }

    domFallback.reveal(playerId, choice, last);
    const log = el.dataset['revealed'] ?? '';
    el.dataset['revealed'] = log ? `${log},${playerId}:${choice}` : `${playerId}:${choice}`;
    vibrate(last ? 'lastCard' : choice === 'steal' ? 'alarm' : 'tap');
  }

  /* ---------------------------------------------------------------- */

  return {
    el,

    activate() {
      void acquireWakeLock();

      buildStage()
        .catch((error) => {
          // Kein WebGL, Atlas kaputt, Speicher voll: Das Spiel laeuft trotzdem weiter.
          console.warn('[reveal] Buehne nicht verfuegbar, DOM-Fallback', error);
          domFallback.enable(el, hint);
        })
        .finally(() => {
          if (destroyed) return;
          /*
           * `?dev=1&hold=1` haelt den Takt an: Dann steht die Buehne still und laesst
           * sich ansehen und messen, ohne dass die Runde weiterlaeuft. Die Karten dreht
           * man ueber das Dev-Panel von Hand um (Roadmap M2.5).
           */
          if (holdMode()) return;
          timer = globalThis.setTimeout(step, 700);
        });
    },

    destroy() {
      destroyed = true;
      finished = true;
      devPanel?.destroy();
      if (timer !== undefined) clearTimeout(timer);
      if (stage && tick) stage.app.ticker.remove(tick);
      camera?.snapHome();
      room?.destroy();
      room = undefined;
      stage?.detach();
      stage?.clearWorld();
      void releaseWakeLock();
    },
  };
}

/* ------------------------------------------------------------------ */
/* DOM-Notnagel                                                        */
/* ------------------------------------------------------------------ */

interface DomFallback {
  /** Baut die Kartenreihe in den Screen ein — nur wenn PIXI ausfaellt. */
  enable(host: HTMLElement, before: HTMLElement): void;
  reveal(playerId: string, choice: Choice, last: boolean): void;
}

/**
 * Die Kartenreihe aus M1. Sie wird nur eingehaengt, wenn die Buehne nicht hochkommt —
 * dann ist die Runde zwar unspektakulaer, aber vollstaendig spielbar.
 */
function createDomFallback(ctx: ScreenContext, result: RoundResult): DomFallback {
  const table = document.createElement('div');
  table.className = 'reveal__table';

  const cards = new Map<string, HTMLElement>();
  let enabled = false;

  for (const playerId of result.revealOrder) {
    const player = ctx.session.playerById(playerId);
    const colorId = player?.colorId ?? 'red';
    const color = colorById(colorId);
    const choice = result.choices[playerId] ?? 'share';

    const card = document.createElement('div');
    card.className = 'revealCard';
    card.style.setProperty('--card-color', hex(color.hex));
    card.style.setProperty('--card-shade', hex(color.shade));

    const inner = document.createElement('div');
    inner.className = 'revealCard__inner';
    inner.innerHTML = `
      <div class="revealCard__face revealCard__face--back">${symbolSvg(color.symbol, hex(textColorOn(colorId)))}</div>
      <div class="revealCard__face revealCard__face--front is-${choice}"></div>`;
    const front = inner.querySelector('.revealCard__face--front');
    if (front) front.textContent = t(`common.${choice}`);

    const name = document.createElement('span');
    name.className = 'revealCard__name';
    name.textContent = player?.name ?? '';

    card.append(inner, name);
    table.append(card);
    cards.set(playerId, card);
  }

  return {
    enable(host, before) {
      enabled = true;
      host.classList.add('is-fallback');
      host.insertBefore(table, before);
    },
    reveal(playerId, choice, last) {
      if (!enabled) return;
      const card = cards.get(playerId);
      if (!card) return;
      card.classList.add('is-revealed', `is-${choice}`);
      if (last) card.classList.add('revealCard--last');
      if (result.moleId === playerId) card.classList.add('is-mole');
      if (result.perjurers.includes(playerId)) card.classList.add('is-perjury');
    },
  };
}
