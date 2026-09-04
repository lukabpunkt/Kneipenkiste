/**
 * Sequenz-Vorschau fuer das Dev-Panel (`npm run preview:sequences`, Roadmap M3).
 *
 * Jede Sequenz braucht einen Weg, sie zu sehen, ohne eine passende Runde zu spielen —
 * auf `treasure_greed` wartet man sonst eine halbe Stunde. Die Vorschau stellt eine
 * Platte in den passenden Zustand, spielt die Timeline und raeumt danach auf.
 *
 * **Sie faelscht das Ergebnis, sie liest es nicht.** Es gibt hier keinen Zugriff auf das
 * private Board: Der `DigResult` wird aus der Sequenzart erfunden. Damit kann die
 * Vorschau nichts verraten, was sie nicht selbst erfunden hat (ADR-2) — sie waere sonst
 * genau die Hintertuer, die das ganze Spiel aushebelt.
 *
 * Dieses Modul wird nur dynamisch geladen, wenn das Panel wirklich geoeffnet wird.
 */

import { play, type AudioCue } from '@/audio/AudioManager';
import type { Hint } from '@/config/rules';
import type { CritterId } from '@/config/theme';
import { createSeededRng } from '@/core/rng';
import type { Cell, DigResult } from '@/core/types';
import type { BoardStage } from '../BoardStage';
import { findSequence, type SequenceContext, type SequenceKind } from './Sequence';

/** Ein erfundenes Ergebnis, das zur Sequenzart passt. */
function fakeResult(kind: SequenceKind, cell: Cell, by: string, hint: Hint): DigResult {
  const base: DigResult = {
    cell,
    by,
    kind: 'empty',
    hint,
    foreignMines: [],
    dudOwners: [],
    ownMineConsumed: false,
    ownDudConsumed: false,
    treasureFound: false,
    chainReveals: [],
    roundOver: false,
    sequenceId: '',
  };

  switch (kind) {
    case 'hit':
      return { ...base, kind: 'crater', foreignMines: ['preview'] };
    case 'dud':
      return { ...base, kind: 'dud', dudOwners: ['preview'] };
    case 'treasure':
      return { ...base, kind: 'treasure', treasureFound: true, roundOver: true, hint: 'none' };
    case 'greed':
      return {
        ...base,
        kind: 'greed',
        treasureFound: true,
        roundOver: true,
        foreignMines: ['preview'],
        hint: 'none',
      };
    case 'empty':
      return base;
  }
}

export interface PreviewOptions {
  /** Welche Platte benutzt wird. Default: die Mitte des Feldes. */
  cell?: Cell;
  /** Welcher Temperatur-Hinweis gezeigt wird. */
  hint?: Hint;
  /** Welches Fundstueck im Loch liegt (nur bei den Leer-Sequenzen sichtbar). */
  critter?: CritterId;
}

/**
 * Spielt eine Sequenz einmal ab und stellt die Platte danach zurueck.
 * Gibt `false` zurueck, wenn es die Sequenz oder die Buehne nicht gibt.
 */
export async function previewSequence(
  stage: BoardStage,
  id: string,
  options: PreviewOptions = {}
): Promise<boolean> {
  const sequence = findSequence(id);
  if (!sequence) return false;

  const cell = options.cell ?? stage.board.centerCell;
  const tile = stage.board.tileAt(cell);
  const diggers = stage.allDiggers();
  const digger = diggers[0];
  if (!tile || !digger) return false;

  const hint = options.hint ?? 'warm';
  const result = fakeResult(sequence.kind, cell, 'preview', hint);

  /* Die Platte in den Zustand bringen, den die Sequenz vorfindet. */
  tile.reset();
  const blamed = [digger.colorId];
  switch (sequence.kind) {
    case 'empty':
      tile.openEmpty(options.critter ?? 'worm', hint);
      break;
    case 'dud':
      tile.dud(blamed, hint);
      break;
    case 'hit':
      tile.crater(blamed, hint);
      break;
    case 'treasure':
      tile.treasure();
      break;
    case 'greed':
      tile.treasure(blamed);
      break;
  }

  const context: SequenceContext = {
    result,
    tile,
    digger,
    others: diggers.slice(1),
    camera: stage.camera,
    blamedColors: blamed,
    rng: createSeededRng(Date.now() & 0xffff),
    audio: (cue: AudioCue, when = 0, detune = 0) => play(cue, when, detune),
    lowEffects: false,
  };

  await sequence.build(context).then();
  tile.reset();
  digger.reset();
  return true;
}
