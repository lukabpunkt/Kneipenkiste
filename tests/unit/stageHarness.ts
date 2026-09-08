/**
 * Eine Bühne ohne Renderer (Audit A4).
 *
 * PIXI-`Container` und `-Sprite` sind reines JavaScript — nur das *Zeichnen* braucht
 * WebGL. Deshalb lässt sich hier die **echte** Bühne bauen: echte Hikers, echte Balken,
 * echte GSAP-Timelines. Kein Mock, der nur so tut.
 *
 * Das ist der Unterschied zwischen "die Sequenz ruft die richtigen Methoden auf" und
 * "die Sequenz ist nach 4,2 Sekunden fertig und der Hiker steht wieder trocken da". A4
 * fragt nach dem Zweiten.
 */

import { Container, Texture, type Spritesheet } from 'pixi.js';
import gsap from 'gsap';
import { Bridge } from '@/game/Bridge';
import { Camera } from '@/game/Camera';
import { Canyon } from '@/game/Canyon';
import { Carpenter } from '@/game/Carpenter';
import { FxKit } from '@/game/fx';
import { Hiker } from '@/game/Hiker';
import { Vulture } from '@/game/Vulture';
import { createSeededRng } from '@/core/rng';
import { resolveRound } from '@/core/round';
import { resultView, type ResultView } from '@/core/publicView';
import { createSequencePicker } from '@/core/choreographer';
import { PLAYER_COLORS } from '@/config/theme';
import { noModes, type ModeFlags } from '@/core/modes';
import type { SequenceContext } from '@/game/sequences';
import type { Choice, PlayerId, Round } from '@/core/types';

/**
 * Ein Spritesheet, das jeden Frame kennt.
 *
 * Der Proxy statt einer Frame-Liste ist Absicht: Fügt jemand eine Sequenz mit einem neuen
 * Frame hinzu, soll der Test an der **Sequenz** scheitern, nicht daran, dass hier ein
 * Eintrag fehlt.
 */
export function fakeSheet(): Spritesheet {
  const textures = new Proxy(
    {},
    {
      get: () => Texture.EMPTY,
      has: () => true,
    }
  );
  return { textures } as unknown as Spritesheet;
}

export interface HarnessOptions {
  /** Wahl pro Spieler: Balkennummer oder `'rope'`. */
  picks: (number | 'rope')[];
  plankCount?: number;
  modes?: Partial<ModeFlags>;
  rottenPlank?: number;
  flags?: Record<PlayerId, number>;
  seed?: number;
}

export interface Harness {
  reveal: ResultView;
  hikers: Map<PlayerId, Hiker>;
  bridge: Bridge;
  /** Baut den Kontext für eine Sequenz auf einer bestimmten Gruppe. */
  contextFor(plank: number, players: PlayerId[], snapMs?: number): SequenceContext;
  /** Welche Sounds die Sequenz gespielt hat, in Reihenfolge. */
  played: string[];
  destroy(): void;
}

export function createHarness(options: HarnessOptions): Harness {
  const sheet = fakeSheet();
  const rng = createSeededRng(options.seed ?? 1234);
  const playerIds = options.picks.map((_, i) => `p${i + 1}`);

  const plankCount = options.plankCount ?? playerIds.length + 2;
  const planks = Array.from({ length: plankCount }, (_, i) => i + 1);
  const bridgeModel = {
    count: plankCount,
    planks,
    removed: [],
    ...(options.rottenPlank !== undefined ? { rottenPlank: options.rottenPlank } : {}),
  };

  const choices: Record<PlayerId, Choice> = {};
  options.picks.forEach((pick, i) => {
    choices[playerIds[i]!] = pick === 'rope' ? { rope: true } : { plank: pick };
  });

  const round: Round = {
    index: 0,
    seed: options.seed ?? 1234,
    playerIds,
    modes: { ...noModes(), ...options.modes },
    bridge: bridgeModel,
    choices,
    ...(options.flags ? { flags: options.flags } : {}),
  };

  const result = resolveRound(round, { rng, picker: createSequencePicker(round.seed) });
  const reveal = resultView(result);

  const canyon = new Canyon({ sheet, rng });
  const bridge = new Bridge({ sheet, model: bridgeModel, slots: plankCount });
  const vulture = new Vulture(sheet);
  const carpenter = new Carpenter(sheet);
  const fx = new FxKit(sheet);
  const camera = new Camera(new Container());
  camera.setBaseScale(1, 400, 900);

  const hikers = new Map<PlayerId, Hiker>();
  playerIds.forEach((playerId, index) => {
    const hiker = new Hiker({
      sheet,
      playerId,
      colorId: PLAYER_COLORS[index % PLAYER_COLORS.length]!.id,
      playerCount: playerIds.length,
    });
    /* Auf ihren Balken stellen — die Sequenz fängt nach dem Anlauf an. */
    const plank = reveal.planks.find((entry) => entry.players.includes(playerId));
    const point = plank ? bridge.standPoint(plank.id, 0, 1, 0) : null;
    if (point) hiker.position(point.x, point.y);
    hikers.set(playerId, hiker);
  });

  const played: string[] = [];

  return {
    reveal,
    hikers,
    bridge,
    played,

    contextFor(plank, players, snapMs = 900): SequenceContext {
      return {
        reveal,
        plank,
        players,
        hikers,
        bridge,
        canyon,
        camera,
        vulture,
        carpenter,
        fx,
        t: (key, params) => `${key}${params ? JSON.stringify(params) : ''}`,
        play: (key) => played.push(key),
        rng,
        timing: { eyeContactMs: 800, snapMs },
      };
    },

    destroy() {
      gsap.globalTimeline.clear();
      for (const hiker of hikers.values()) hiker.destroy();
      bridge.destroy();
      vulture.destroy();
      carpenter.destroy();
      fx.destroy();
      canyon.destroy();
    },
  };
}

/** Die Kollisionsgruppe dieser Runde — die meisten Sequenzen wollen genau die. */
export function collisionGroup(harness: Harness): { plank: number; players: PlayerId[] } {
  const plank = harness.reveal.planks.find((entry) => entry.collision);
  if (!plank) throw new Error('Diese Runde hat keine Kollision.');
  return { plank: plank.id, players: plank.players };
}
