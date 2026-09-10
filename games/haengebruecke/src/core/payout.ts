/**
 * Die Auszahlung (GDD §3.5, Architektur §5) — der Regelkern.
 *
 * Reine Funktion: gleiche Runde rein, gleiches Ergebnis raus. Kein Zufall, keine Uhr,
 * kein Rendering. `resolveRound()` in `round.ts` ruft sie **genau einmal** pro Runde beim
 * Uebergang SEALED → STEP; die Show liest danach nur noch ab.
 */

import {
  COLLISION_SIPS_PER_PERSON,
  DESERTER_SIP_FACTOR,
  GIVING_SAFE,
  GIVING_SAFE_DEATH_ZONE,
  MASS_COLLISION_GROUP_COUNT,
  MASS_COLLISION_GROUP_SIZE,
  PLANK_THIEF_BONUS,
  ROPE_FEE_SIPS,
  ROTTEN_SIPS,
} from '@/config/rules';
import { isDeathZone } from './bridge';
import { findPlankThieves, isDeserter, isRottenBreak, weightOf, type Theft } from './modes';
import { isRopeChoice } from './choice';
import type { Banner, Drinker, Outcome, PlankGroup, PlayerId, Round } from './types';

export interface Payout {
  groups: PlankGroup[];
  ropeUsers: PlayerId[];
  deathZone: boolean;
  outcome: Outcome;
  banner: Banner;
  drinkers: Drinker[];
  /** Nur Eintraege > 0 — der Distribute-Screen iteriert genau darueber. */
  giving: Record<PlayerId, number>;
  deserters: PlayerId[];
  plankThieves: Theft[];
}

/* ------------------------------------------------------------------ */
/* Gruppierung                                                         */
/* ------------------------------------------------------------------ */

/**
 * Wer steht mit wem auf einem Balken? Seil-Nutzer tauchen hier nicht auf — sie hangeln
 * sich unter der Bruecke durch und stehen auf gar keinem Balken.
 *
 * Reihenfolge: Balken aufsteigend, Spieler in Lobby-Reihenfolge. Der Choreographer baut
 * daraus die Bruch-Reihenfolge, also muss sie deterministisch sein.
 */
export function groupByPlank(round: Round): PlankGroup[] {
  const byPlank = new Map<number, PlayerId[]>();

  for (const playerId of round.playerIds) {
    const choice = round.choices[playerId];
    if (!choice || isRopeChoice(choice)) continue;
    const existing = byPlank.get(choice.plank);
    if (existing) existing.push(playerId);
    else byPlank.set(choice.plank, [playerId]);
  }

  return [...byPlank.entries()]
    .sort(([a], [b]) => a - b)
    .map(([plank, players]) => {
      const group: PlankGroup = {
        plank,
        players,
        collision: players.length >= 2,
        rotten: false,
      };
      group.rotten = isRottenBreak(round, group);
      return group;
    });
}

export function ropeUsersOf(round: Round): PlayerId[] {
  return round.playerIds.filter((id) => {
    const choice = round.choices[id];
    return choice !== undefined && isRopeChoice(choice);
  });
}

/* ------------------------------------------------------------------ */
/* Auszahlung                                                          */
/* ------------------------------------------------------------------ */

/**
 * Die eine Abrechnung.
 *
 * Reihenfolge im Code == Reihenfolge in der Regeltabelle des GDD: erst gruppieren, dann
 * trinken, dann verteilen, dann das Banner. Wer eine Regel sucht, findet sie an der
 * Stelle, an der sie im GDD steht.
 */
export function resolvePayout(round: Round): Payout {
  const playerCount = round.playerIds.length;
  const groups = groupByPlank(round);
  const ropeUsers = ropeUsersOf(round);
  const deathZone = isDeathZone(round.bridge, playerCount);

  const deserters = round.playerIds.filter((id) => {
    const choice = round.choices[id];
    return choice !== undefined && isDeserter(round, id, choice);
  });
  const deserterSet = new Set(deserters);
  const plankThieves = findPlankThieves(round, groups);

  const anyCollision = groups.some((g) => g.collision);

  const drinkers: Drinker[] = [];
  const giving: Record<PlayerId, number> = {};

  const addGiving = (playerId: PlayerId, sips: number): void => {
    if (sips <= 0) return;
    giving[playerId] = (giving[playerId] ?? 0) + sips;
  };

  for (const group of groups) {
    if (group.collision) {
      /* Jeder auf dem Balken trinkt so viele Schlucke, wie Leute drauf stehen. */
      const base = group.players.length * COLLISION_SIPS_PER_PERSON;
      for (const playerId of group.players) {
        const deserted = deserterSet.has(playerId);
        drinkers.push({
          playerId,
          sips: base * weightOf(round, playerId) * (deserted ? DESERTER_SIP_FACTOR : 1),
          reason: deserted ? 'deserterDouble' : 'collision',
        });
      }
      continue;
    }

    const soloist = group.players[0]!;

    if (group.rotten) {
      /* Allein — und trotzdem nass. Der Balken war morsch, das konnte niemand wissen. */
      drinkers.push({ playerId: soloist, sips: ROTTEN_SIPS, reason: 'rotten' });
      continue;
    }

    /*
     * Sicher — aber verteilt wird nur, wenn wirklich jemand gefallen ist (GDD §3.5:
     * "Alle sicher: Niemand trinkt, niemand verteilt"). Genau daran haengt Design-Pfeiler
     * 3: Eine friedliche Runde bringt niemandem etwas ein, kostet aber einen Balken —
     * deshalb will irgendwann jeder, dass jemand faellt. Nur eben nicht er selbst.
     */
    if (!anyCollision) continue;

    /*
     * Ein Fahnenfluechtiger bekommt auch dann nichts: Er steht zwar trocken da, aber sein
     * Wort war nichts wert — und genau das ist der Preis (GDD §3.6).
     */
    if (deserterSet.has(soloist)) continue;

    const perSip = deathZone ? GIVING_SAFE_DEATH_ZONE : GIVING_SAFE;
    addGiving(soloist, perSip * weightOf(round, soloist));
  }

  /* Das Seil ist sicher, aber nicht umsonst — und es bringt nichts ein. */
  for (const playerId of ropeUsers) {
    drinkers.push({ playerId, sips: ROPE_FEE_SIPS, reason: 'ropeFee' });
  }

  /* Der Dieb faellt mit — verteilt aber trotzdem. Das macht den Verrat lukrativ. */
  for (const theft of plankThieves) addGiving(theft.thief, PLANK_THIEF_BONUS);

  const collisionGroups = groups.filter((g) => g.collision);
  const rottenBroke = groups.some((g) => g.rotten);
  const outcome = outcomeOf(collisionGroups, rottenBroke, deathZone);

  return {
    groups,
    ropeUsers,
    deathZone,
    outcome,
    banner: bannerOf(outcome, anyCollision, rottenBroke, deserters.length > 0),
    drinkers,
    giving,
    deserters,
    plankThieves,
  };
}

/* ------------------------------------------------------------------ */
/* Outcome & Banner (GDD §3.7)                                         */
/* ------------------------------------------------------------------ */

function outcomeOf(
  collisionGroups: readonly PlankGroup[],
  rottenBroke: boolean,
  deathZone: boolean
): Outcome {
  if (deathZone) return 'deathZone';
  if (
    collisionGroups.length >= MASS_COLLISION_GROUP_COUNT ||
    collisionGroups.some((g) => g.players.length >= MASS_COLLISION_GROUP_SIZE)
  ) {
    return 'massCollision';
  }
  if (collisionGroups.length > 0 || rottenBroke) return 'collision';
  return 'allSafe';
}

/**
 * Das Banner erzaehlt, nicht es rechnet. Deshalb hat es eine eigene Rangfolge: Erst das
 * groesste Ereignis (Todeszone, Massensturz), dann die beste Geschichte (Fahnenflucht —
 * die gilt auch, wenn der Verraeter trocken davonkommt), dann der normale Krach.
 */
function bannerOf(
  outcome: Outcome,
  anyCollision: boolean,
  rottenBroke: boolean,
  anyDeserter: boolean
): Banner {
  if (outcome === 'deathZone') return 'deathZone';
  if (outcome === 'massCollision') return 'massCollision';
  if (anyDeserter) return 'desertion';
  if (anyCollision) return 'crash';
  if (rottenBroke) return 'badLuck';
  return 'allSafe';
}
