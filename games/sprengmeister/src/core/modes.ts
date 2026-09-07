/**
 * Die Modi (GDD §3.6) — reine Funktionen, kombinierbar.
 *
 * Jeder Modus greift an genau einer Stelle an; hier steht, an welcher, damit man nicht
 * fuenf Dateien lesen muss, um zu verstehen, was ein Haken in der Lobby bewirkt:
 *
 * | Modus              | Angriffspunkt                                                    |
 * |--------------------|------------------------------------------------------------------|
 * | **Doppelagent**    | `rules.loadoutFor` (1 Mine + 1 Blindgaenger), Sequenz-Filter      |
 * | **Nachtgraeber**   | `board.hintFor` → immer `'none'`                                  |
 * | **Zwei Kisten**    | `rules.chestCount` / `rules.treasureTokens`                       |
 * | **Kettenreaktion** | `board.dig` → `applyChainReaction`                                |
 * | **Sprengmeister**  | dieses Modul: `masterBonuses` (Extra-Token) und `cowards` (Strafe)|
 */

import {
  COWARD_SIPS,
  MASTER_BONUS_TOKENS,
  MASTER_BONUS_VICTIMS,
  MODE_IDS,
  loadoutFor,
  type ModeId,
  type Modes,
} from '@/config/rules';
import type { DigResult, PlayerId } from './types';

/** Ist ueberhaupt ein Modus aktiv? Steuert nur die Anzeige in der Lobby. */
export function anyModeActive(modes: Modes): boolean {
  return MODE_IDS.some((id) => modes[id]);
}

export function activeModes(modes: Modes): ModeId[] {
  return MODE_IDS.filter((id) => modes[id]);
}

/* ------------------------------------------------------------------ */
/* Doppelagent (GDD §3.6)                                              */
/* ------------------------------------------------------------------ */

/**
 * Der Blindgaenger macht "Pfff" und zeigt trotzdem die Farbe des Legers. Genau darum
 * funktioniert der Bluff: Man sieht, **wer** dort gelegt hat, weiss aber vorher nie, ob
 * es knallt.
 */
export function dudsEnabled(modes: Modes): boolean {
  return modes.doubleAgent;
}

/**
 * `hit_dud_then_boom` faellt im Doppelagent-Modus aus der Registry (Architektur §6):
 * Eine Mine, die erst "klick" macht und dann doch knallt, waere von einem echten
 * Blindgaenger nicht zu unterscheiden — der Gag wuerde die Modus-Regel kaputt machen.
 */
export function sequenceAllowed(
  sequence: { excludeInModes?: readonly ModeId[] | undefined },
  modes: Modes
): boolean {
  return !sequence.excludeInModes?.some((id) => modes[id]);
}

/* ------------------------------------------------------------------ */
/* Sprengmeister-Bonus (GDD §3.6)                                      */
/* ------------------------------------------------------------------ */

/**
 * Wer mit seinen Minen in **einer** Runde mindestens zwei **verschiedene** Spieler
 * erwischt hat, bekommt ein Extra-Token. Belohnt Streuung statt Doppelbelegung.
 *
 * Gezaehlt werden nur Opfer, die auch getrunken haben — Krater, die eine Kettenreaktion
 * aufgerissen hat, kosten niemanden etwas und zaehlen deshalb nicht (GDD §3.6).
 */
export function masterBonuses(digs: readonly DigResult[], modes: Modes): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  if (!modes.masterBonus) return out;

  const victimsOf = new Map<PlayerId, Set<PlayerId>>();
  for (const dig of digs) {
    if (dig.kind !== 'crater' && dig.kind !== 'greed') continue;
    for (const layer of dig.foreignMines) {
      let victims = victimsOf.get(layer);
      if (!victims) {
        victims = new Set();
        victimsOf.set(layer, victims);
      }
      victims.add(dig.by);
    }
  }

  for (const [layer, victims] of victimsOf) {
    if (victims.size >= MASTER_BONUS_VICTIMS) out[layer] = MASTER_BONUS_TOKENS;
  }
  return out;
}

/**
 * "Feigling": Wer **alle** eigenen Sprengkoerper selbst als Trittstein benutzt hat,
 * trinkt einen. Bestraft uebervorsichtiges Spiel — wer nur auf sicheren Feldern graebt,
 * verraet den anderen ohnehin, wo seine Minen lagen.
 *
 * Im Doppelagent-Modus zaehlen Mine und Blindgaenger zusammen: Beide sind stumm, beide
 * sind sichere Felder, die nur der Leger kennt.
 */
export function cowards(digs: readonly DigResult[], modes: Modes): PlayerId[] {
  if (!modes.masterBonus) return [];

  const loadout = loadoutFor(modes);
  const needed = loadout.mine + loadout.dud;
  if (needed === 0) return [];

  const used = new Map<PlayerId, number>();
  for (const dig of digs) {
    const own = (dig.ownMineConsumed ? 1 : 0) + (dig.ownDudConsumed ? 1 : 0);
    if (own === 0) continue;
    used.set(dig.by, (used.get(dig.by) ?? 0) + own);
  }

  const out: PlayerId[] = [];
  for (const [playerId, count] of used) {
    if (count >= needed) out.push(playerId);
  }
  return out;
}

export { COWARD_SIPS };
