/**
 * Buehnen-Attrappe fuer die Inszenierungs-Tests (Roadmap M4.1, Audit A4).
 *
 * Die elf Sequenzen bauen GSAP-Timelines aus der fertigen Buehne. Fuer die beiden
 * Zusicherungen aus der Definition of Done — **Dauer 2–8 s** und **Reset-Invariante** —
 * braucht es davon keinen Renderer: GSAP tweent auch schlichte Objekte, und ob eine
 * Sequenz ihre Figuren wieder gerade hinstellt, sieht man an den Zahlen.
 *
 * Die Attrappe ersetzt deshalb Crooks, Tresor, Kamera und FX durch Objekte mit derselben
 * Schnittstelle, die mitschreiben, was mit ihnen passiert. Was sie **nicht** faelscht:
 * die Timelines. Jede Sequenz laeuft hier mit ihrem echten Zeitplan.
 *
 * Der Renderer-Teil — sieht es gut aus, sitzt der Gag — gehoert in die Dev-Preview und
 * in Lukas Augen, nicht in einen Unit-Test.
 */

import gsap from 'gsap';
import { STAGE } from '@/config/theme';
import { createSeededRng } from '@/core/rng';
import type { AudioCue } from '@/audio/AudioManager';
import type { OutcomeContext } from '@/game/outcomes/OutcomeSequence';
import type { RoundResult } from '@/core/types';

/** Ein bewegliches Etwas mit Position, Skalierung und Alpha — mehr fasst keine Sequenz an. */
function movable(x = 0, y = 0): {
  x: number;
  y: number;
  alpha: number;
  rotation: number;
  scale: { x: number; y: number; set(x: number, y?: number): void };
  position: { x: number; y: number; set(x: number, y?: number): void };
} {
  const scale = {
    x: 1,
    y: 1,
    set(sx: number, sy?: number) {
      scale.x = sx;
      scale.y = sy ?? sx;
    },
  };
  const node = {
    x,
    y,
    alpha: 1,
    rotation: 0,
    scale,
    position: {
      x,
      y,
      set(px: number, py?: number) {
        node.position.x = px;
        node.position.y = py ?? px;
        node.x = px;
        node.y = py ?? px;
      },
    },
  };
  return node;
}

type Movable = ReturnType<typeof movable>;

/** Was eine Attrappen-Figur ueber sich preisgibt. */
export interface FakeCrook {
  view: Movable;
  body: Movable;
  head: Movable;
  armL: { rotation: number };
  armR: { rotation: number };
  faces: string[];
  props: number;
  bag: boolean;
  position: { x: number; y: number };
  reset(): void;
}

const ARM_REST = 0.2;

/*
 * Rueckgabetyp ist bewusst `FakeCrook` und nicht `FakeCrook & Crook`: `Crook` haelt
 * `body`, `head` und die Arme privat, und eine Schnittmasse mit privaten Feldern ist in
 * TypeScript `never`. Die Attrappe wandert deshalb erst beim Bau des `OutcomeContext`
 * ueber einen Cast an ihren Platz — dort, wo ohnehin die ganze Buehne gefaelscht wird.
 */
function fakeCrook(x: number, y: number): FakeCrook {
  const view = movable(x, y);
  const body = movable();
  const head = movable();
  const armL = { rotation: ARM_REST };
  const armR = { rotation: -ARM_REST };
  const faces: string[] = [];
  const state = { props: 0, bag: false };

  const crook = {
    view,
    body,
    head,
    armL,
    armR,
    faces,
    get props() {
      return state.props;
    },
    get bag() {
      return state.bag;
    },
    colorId: 'purple',
    armRest: ARM_REST,
    get position() {
      return { x: view.position.x, y: view.position.y };
    },
    get rig() {
      return { body, head, torso: movable(), armL, armR };
    },
    setPosition(px: number, py: number) {
      view.position.set(px, py);
    },
    setFace(face: string) {
      faces.push(face);
    },
    getFace: () => faces.at(-1) ?? 'neutral',
    setHat: () => {},
    showBag(visible: boolean) {
      state.bag = visible;
    },
    attachProp() {
      state.props += 1;
    },
    clearProps() {
      state.props = 0;
    },
    lookAt: () => {},
    lookAhead: () => {},
    setLowEffects: () => {},
    update: () => {},

    shrug: () => gsap.timeline().to(armL, { rotation: ARM_REST + 0.9, duration: 0.4 }),
    celebrate: (times = 2) =>
      gsap.timeline().to(body, { y: -60, duration: 0.2, repeat: times * 2 - 1, yoyo: true }),
    flatten: () => gsap.timeline().to(body.scale, { x: 1.5, y: 0.3, duration: 0.6 }),
    jawDrop: () => gsap.timeline().to(body.scale, { x: 0.94, y: 1.06, duration: 0.12 }),
    growNose: (steps = 3) => gsap.timeline().to(head, { rotation: 0, duration: 0.14 * steps }),
    stamp: () => {
      state.props += 1;
      return gsap.timeline().to(body, { rotation: 0, duration: 0.4 });
    },
    moveTo: (px: number, py: number, durationMs: number, ease = 'power2.inOut') =>
      gsap.timeline().to(view, { x: px, y: py, duration: durationMs / 1000, ease }),

    /** Die Ausgangspose — genau das, was `Crook.reset()` im Ernstfall herstellt. */
    reset() {
      gsap.killTweensOf([view, body, body.scale, head, armL, armR, view.scale]);
      view.rotation = 0;
      view.alpha = 1;
      view.scale.set(1);
      body.position.set(0, 0);
      body.x = 0;
      body.y = 0;
      body.rotation = 0;
      body.scale.set(1);
      body.alpha = 1;
      head.rotation = 0;
      head.scale.set(1);
      armL.rotation = ARM_REST;
      armR.rotation = -ARM_REST;
      state.bag = false;
      state.props = 0;
      faces.length = 0;
    },
  };
  return crook as unknown as FakeCrook;
}

export interface StageDouble {
  ctx: OutcomeContext;
  crooks: Map<string, FakeCrook>;
  /** Alle abgespielten Cues mit ihrem Zeitversatz — die Sound-Regie ist pruefbar. */
  cues: { cue: AudioCue; when: number }[];
  /** Kassels Kommentare (i18n-Schluessel). */
  lines: string[];
  /** Gespawnte Requisiten: Frame-Namen in der Reihenfolge ihres Auftritts. */
  props: string[];
  /** Wieviele Zaehler-Popups gebaut wurden — der Trinker-Moment ist Pflicht. */
  counters: number;
  /** Stellt die Buehne zurueck, wie es `VaultRoom.reset()` tut. */
  reset(): void;
}

/**
 * Baut eine Attrappe fuer ein fertiges Rundenergebnis.
 *
 * Die Sitzpositionen sind gleichmaessig verteilt — die echte Bogengeometrie steckt in
 * `layout.ts` und wird dort getestet.
 */
export function stageDouble(result: RoundResult, playerIds: readonly string[]): StageDouble {
  const crooks = new Map<string, FakeCrook>();
  playerIds.forEach((id, index) => {
    const x = STAGE.worldSize * (0.2 + (0.6 * index) / Math.max(1, playerIds.length - 1));
    crooks.set(id, fakeCrook(x, STAGE.worldSize * 0.62));
  });

  const cues: { cue: AudioCue; when: number }[] = [];
  const lines: string[] = [];
  const props: string[] = [];
  const spawned: Movable[] = [];
  const state = { counters: 0 };

  const vaultState = { fill: 1, bursts: 0 };
  const camera = movable(STAGE.worldSize / 2, STAGE.worldSize / 2);

  const kasselView = movable(STAGE.worldSize * 0.72, STAGE.worldSize * 0.32);

  const room = {
    crooks,
    kassel: {
      view: kasselView,
      say(text: string, holdMs?: number) {
        void holdMs;
        lines.push(text);
      },
      silence: () => {},
    },
    vault: {
      get fill() {
        return vaultState.fill;
      },
      setFill(fill: number) {
        vaultState.fill = fill;
      },
      burst() {
        vaultState.bursts += 1;
        return gsap.timeline().to({}, { duration: 0.6 });
      },
      grow: (to: number) => gsap.timeline().call(() => (vaultState.fill = to)),
      drain: (to: number) => gsap.timeline().call(() => (vaultState.fill = to)),
      openDoor: () => gsap.timeline().to({}, { duration: 0.4 }),
      closeDoor: () => gsap.timeline().to({}, { duration: 0.4 }),
    },
    frontSheet: { textures: {} },
    lookAhead: () => {},
    lookAtCard: () => {},
    raiseAlarm: () => gsap.timeline().to({}, { duration: 0.6 }),
    flash: () => gsap.timeline().to({}, { duration: 0.2 }),
    narrowSpot: () => gsap.timeline().to({}, { duration: 0.3 }),
    spawnProp(frame: string, x: number, y: number, scale = 1) {
      props.push(frame);
      const sprite = movable(x, y);
      sprite.scale.set(scale);
      spawned.push(sprite);
      return sprite;
    },
  };

  const fxTimeline = (durationSec: number): gsap.core.Timeline =>
    gsap.timeline().to({}, { duration: durationSec });

  const ctx = {
    result,
    room,
    camera: {
      moveTo: () => fxTimeline(0.4),
      reset: () => fxTimeline(0.4),
      shake: () => fxTimeline(0.25),
      snapHome: () => {},
      view: camera,
    },
    thieves: result.thieves.map((id) => crooks.get(id)!).filter(Boolean),
    sharers: playerIds.filter((id) => !result.thieves.includes(id)).map((id) => crooks.get(id)!),
    cards: new Map(),
    counters: {
      pop(x: number, y: number, sips: number, delayMs = 0) {
        void x;
        void y;
        void sips;
        state.counters += 1;
        return gsap.timeline().to({}, { duration: 0.8 + delayMs / 1000 });
      },
    },
    fx: {
      coinRain: () => fxTimeline(1.4),
      coinsTo: () => fxTimeline(0.5),
      confettiBurst: () => fxTimeline(1.9),
      starsAbove: () => fxTimeline(1.2),
      heartsAbove: () => fxTimeline(1.8),
      smokePuff: () => fxTimeline(0.9),
    },
    rng: createSeededRng(result.seed),
    play(cue: AudioCue, when = 0) {
      cues.push({ cue, when });
    },
    positionOf: (playerId: string) => crooks.get(playerId)?.position ?? { x: 0, y: 0 },
    headOf: (playerId: string) => {
      const at = crooks.get(playerId)?.position ?? { x: 0, y: 0 };
      return { x: at.x, y: at.y - 200 };
    },
    say(key: string, holdMs?: number) {
      void holdMs;
      lines.push(key);
    },
  } as unknown as OutcomeContext;

  return {
    ctx,
    crooks,
    cues,
    lines,
    props,
    get counters() {
      return state.counters;
    },
    reset() {
      for (const crook of crooks.values()) crook.reset();
      props.length = 0;
      spawned.length = 0;
      vaultState.fill = 1;
    },
  };
}
