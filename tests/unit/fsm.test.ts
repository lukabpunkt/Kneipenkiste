/**
 * Game-State-Machine (A0-Audit: Branch-Coverage 100 %).
 *
 * Geprueft wird jeder Uebergang aus Architektur §3 — inklusive der beiden Stellen, die
 * "genau einmal" laufen muessen: die Hinweise bei PACKED → HALL und die Schranken-
 * Reihenfolge bei INSPECT → GATE.
 */

import { describe, expect, it } from 'vitest';
import { createFsm, type GameState } from '@/core/fsm';
import { modeFlags } from '@/core/modes';
import { amountOf } from '@/core/round';
import { makePlayers, rngFor } from './helpers';

interface SetupOptions {
  players?: number;
  modes?: Parameters<typeof modeFlags>[0];
  seed?: number;
}

function setup(options: SetupOptions = {}) {
  return createFsm({
    players: makePlayers(options.players ?? 5),
    modes: modeFlags(options.modes),
    rng: rngFor(options.seed ?? 42),
  });
}

/** Spielt bis PACK des ersten Reisenden. */
function toFirstPack(fsm: ReturnType<typeof setup>) {
  fsm.send({ type: 'start' });
  fsm.send({ type: 'open' });
  fsm.send({ type: 'tap' }); // OFFICER_INTRO → PASS
  fsm.send({ type: 'tap' }); // PASS → PACK
  return fsm;
}

/** Packt alle Reisenden mit den gegebenen Mengen und geht bis HALL. */
function toHall(fsm: ReturnType<typeof setup>, amounts: number[]) {
  toFirstPack(fsm);
  const travelers = fsm.context.round!.travelerIds.length;
  for (let i = 0; i < travelers; i++) {
    fsm.send({ type: 'closeSuitcase', amount: amounts[i] ?? 0 });
    if (i < travelers - 1) fsm.send({ type: 'tap' }); // PASS → PACK
  }
  fsm.send({ type: 'tap' }); // PACKED → HALL
  return fsm;
}

describe('Grundgeruest', () => {
  it('startet in TITLE und laesst nur `start` zu', () => {
    const fsm = setup();
    expect(fsm.state).toBe('TITLE');
    expect(fsm.can('start')).toBe(true);
    expect(fsm.can('open')).toBe(false);
    expect(fsm.send({ type: 'open' })).toBe(false);
    expect(fsm.send({ type: 'start' })).toBe(true);
    expect(fsm.state).toBe('LOBBY');
  });

  it('oeffnet die Grenze erst ab 4 Spielern', () => {
    const fsm = createFsm({ players: makePlayers(3), rng: rngFor(1) });
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'open' })).toBe(false);
    expect(fsm.state).toBe('LOBBY');

    fsm.setPlayers(makePlayers(4));
    expect(fsm.send({ type: 'open' })).toBe(true);
    expect(fsm.state).toBe('OFFICER_INTRO');
  });

  it('weist mehr als 8 Spieler ab', () => {
    const fsm = createFsm({ players: makePlayers(9), rng: rngFor(1) });
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'open' })).toBe(false);
  });

  it('kommt ohne Optionen aus', () => {
    const fsm = createFsm();
    expect(fsm.state).toBe('TITLE');
    expect(fsm.context.players).toEqual([]);
    expect(fsm.context.modes).toEqual(modeFlags());
  });
});

describe('Packen', () => {
  it('reicht das Handy an jeden Reisenden weiter und ueberspringt den Beamten', () => {
    const fsm = setup({ players: 5 });
    toFirstPack(fsm);

    const travelers = fsm.context.round!.travelerIds;
    expect(travelers).not.toContain(fsm.context.round!.officerId);
    expect(fsm.currentTraveler()).toBe(travelers[0]);

    fsm.send({ type: 'closeSuitcase', amount: 3 });
    expect(fsm.state).toBe('PASS');
    expect(fsm.currentTraveler()).toBe(travelers[1]);

    fsm.send({ type: 'tap' });
    fsm.send({ type: 'closeSuitcase', amount: 0 });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'closeSuitcase', amount: 0 });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'closeSuitcase', amount: 0 });

    expect(fsm.state).toBe('PACKED');
    expect(amountOf(fsm.context.round!, travelers[0]!)).toBe(3);
  });

  it('meldet ausserhalb von PASS/PACK keinen aktuellen Reisenden', () => {
    const fsm = setup();
    expect(fsm.currentTraveler()).toBeNull();
  });

  it('weist ungueltige Mengen ab', () => {
    const fsm = toFirstPack(setup());
    expect(() => fsm.send({ type: 'closeSuitcase', amount: 7 })).toThrow(RangeError);
    expect(() => fsm.send({ type: 'closeSuitcase', amount: -1 })).toThrow(RangeError);
    expect(() => fsm.send({ type: 'closeSuitcase', amount: 1.5 })).toThrow(RangeError);
  });

  it('erlaubt in Hochsaison bis 10', () => {
    const fsm = toFirstPack(setup({ modes: { highSeason: true } }));
    expect(fsm.send({ type: 'closeSuitcase', amount: 10 })).toBe(true);
  });
});

describe('Hinweise', () => {
  it('zieht sie genau einmal beim Uebergang PACKED → HALL', () => {
    const fsm = toHall(setup(), [4, 0, 0, 0]);
    expect(fsm.state).toBe('HALL');
    expect(fsm.hintDrawCount).toBe(1);
    expect(fsm.context.round!.hints.length).toBeGreaterThan(0);

    /* Ein zweites `tap` gibt es in HALL nicht — die Hinweise koennen nicht neu fallen. */
    expect(fsm.can('tap')).toBe(false);
    expect(fsm.hintDrawCount).toBe(1);
  });
});

describe('Kontrolle', () => {
  it('oeffnet bis zu k Koffer und geht dann zur Schranke', () => {
    const fsm = toHall(setup({ players: 5 }), [3, 0, 2, 0]);
    fsm.send({ type: 'endInterrogation' });
    expect(fsm.state).toBe('INSPECT');
    expect(fsm.context.round!.maxOpenings).toBe(2);

    const travelers = fsm.context.round!.travelerIds;

    fsm.send({ type: 'inspectSuitcase', suitcaseOf: travelers[0]! });
    expect(fsm.context.pendingResult?.kind).toBe('caught');
    /* Waehrend die Sequenz laeuft, geht kein zweiter Tap durch. */
    expect(fsm.send({ type: 'inspectSuitcase', suitcaseOf: travelers[1]! })).toBe(false);

    fsm.send({ type: 'resultShown' });
    expect(fsm.state).toBe('INSPECT');
    expect(fsm.context.pendingResult).toBeNull();

    fsm.send({ type: 'inspectSuitcase', suitcaseOf: travelers[1]! });
    fsm.send({ type: 'resultShown' });
    expect(fsm.state).toBe('GATE');
    expect(fsm.gateDrawCount).toBe(1);
  });

  it('erlaubt Durchwinken jederzeit', () => {
    const fsm = toHall(setup(), [0, 0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'waveAll' });

    expect(fsm.state).toBe('GATE');
    expect(fsm.context.round!.openings).toHaveLength(0);
    expect(fsm.gateDrawCount).toBe(1);
  });

  it('berechnet die Schranken-Reihenfolge genau einmal', () => {
    const fsm = toHall(setup(), [0, 0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'waveAll' });
    const order = fsm.context.round!.gateOrder;

    fsm.send({ type: 'allPassed' });
    expect(fsm.gateDrawCount).toBe(1);
    expect(fsm.context.round!.gateOrder).toEqual(order);
  });
});

describe('Schranke, Verteilen, Result', () => {
  it('ueberspringt DISTRIBUTE, wenn niemand Tokens hat', () => {
    /* Ehrliche Runde, alles durchgewunken → nur der Menschenkenntnis-Bonus … */
    const fsm = toHall(setup(), [0, 0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'waveAll' });
    fsm.send({ type: 'allPassed' });

    /* … und der gibt dem Beamten ein Token, also gibt es doch etwas zu verteilen. */
    expect(fsm.state).toBe('DISTRIBUTE');
    expect(fsm.context.result!.bonuses[0]!.reason).toBe('goodInstinct');

    fsm.send({ type: 'distributeNext', distribution: [] });
    expect(fsm.state).toBe('RESULT');
  });

  it('geht ohne jedes Token direkt nach RESULT', () => {
    /* Ein einziger sauberer Koffer wird geoeffnet: niemand bekommt Tokens. */
    const fsm = toHall(setup({ players: 4 }), [0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'inspectSuitcase', suitcaseOf: fsm.context.round!.travelerIds[0]! });
    fsm.send({ type: 'resultShown' });
    expect(fsm.state).toBe('GATE');

    fsm.send({ type: 'allPassed' });
    expect(fsm.context.tokenOwners).toEqual([]);
    expect(fsm.state).toBe('RESULT');
    expect(fsm.context.result!.banner).toBe('honestRound');
  });

  it('iteriert im Distribute-Screen ueber alle Token-Besitzer, Beamter zuerst', () => {
    const fsm = toHall(setup({ players: 6 }), [4, 3, 0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'inspectSuitcase', suitcaseOf: fsm.context.round!.travelerIds[0]! });
    fsm.send({ type: 'resultShown' });
    fsm.send({ type: 'waveAll' });
    fsm.send({ type: 'allPassed' });

    const owners = fsm.context.tokenOwners;
    expect(owners[0]).toBe(fsm.context.round!.officerId);
    expect(owners).toHaveLength(2);

    expect(fsm.state).toBe('DISTRIBUTE');
    fsm.send({ type: 'distributeNext', distribution: [{ from: owners[0]!, to: 'p1', sips: 4 }] });
    expect(fsm.state).toBe('DISTRIBUTE');
    expect(fsm.context.distributeIndex).toBe(1);

    fsm.send({ type: 'distributeNext', distribution: [{ from: owners[1]!, to: 'p0', sips: 3 }] });
    expect(fsm.state).toBe('RESULT');
    expect(fsm.context.result!.distribution).toHaveLength(2);
  });

  it('rotiert den Beamten in der naechsten Runde', () => {
    const fsm = toHall(setup(), [0, 0, 0, 0]);
    const firstOfficer = fsm.context.round!.officerId;
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'waveAll' });
    fsm.send({ type: 'allPassed' });
    fsm.send({ type: 'distributeNext', distribution: [] });

    expect(fsm.state).toBe('RESULT');
    fsm.send({ type: 'nextRound' });

    expect(fsm.state).toBe('OFFICER_INTRO');
    expect(fsm.context.roundIndex).toBe(1);
    expect(fsm.context.round!.officerId).not.toBe(firstOfficer);
    expect(fsm.hintDrawCount).toBe(1);
  });

  it('geht von RESULT zurueck in die Lobby', () => {
    const fsm = toHall(setup({ players: 4 }), [0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    fsm.send({ type: 'waveAll' });
    fsm.send({ type: 'allPassed' });
    fsm.send({ type: 'distributeNext', distribution: [] });
    fsm.send({ type: 'changePlayers' });

    expect(fsm.state).toBe('LOBBY');
    expect(fsm.context.round).toBeNull();
  });
});

describe('Bestechung ueber die FSM', () => {
  it('nimmt Angebote nur in HALL entgegen', () => {
    const fsm = setup({ modes: { bribery: true } });
    expect(fsm.bribe('p1', 2)).toBe(false);
    expect(fsm.answerBribe('p1', true)).toBe(false);

    toHall(fsm, [3, 0, 0, 0]);
    const traveler = fsm.context.round!.travelerIds[0]!;

    expect(fsm.bribe(traveler, 2)).toBe(true);
    expect(fsm.answerBribe(traveler, true)).toBe(true);
    expect(fsm.context.round!.bribes[0]!.accepted).toBe(true);

    fsm.send({ type: 'endInterrogation' });
    /* Der bezahlte Koffer ist nicht tippbar — der Tap wird still verworfen, nicht geworfen. */
    expect(fsm.send({ type: 'inspectSuitcase', suitcaseOf: traveler })).toBe(false);
    expect(fsm.context.round!.openings).toHaveLength(0);
  });

  it('verwirft Taps auf bereits geoeffnete und auf fremde Koffer', () => {
    const fsm = toHall(setup({ players: 5 }), [2, 0, 0, 0]);
    fsm.send({ type: 'endInterrogation' });
    const traveler = fsm.context.round!.travelerIds[0]!;

    fsm.send({ type: 'inspectSuitcase', suitcaseOf: traveler });
    fsm.send({ type: 'resultShown' });

    expect(fsm.send({ type: 'inspectSuitcase', suitcaseOf: traveler })).toBe(false);
    expect(fsm.send({ type: 'inspectSuitcase', suitcaseOf: fsm.context.round!.officerId })).toBe(false);
    expect(fsm.context.round!.openings).toHaveLength(1);
  });
});

describe('Abbrechen und Beenden', () => {
  it('bricht die Runde aus jedem Spiel-Screen ab', () => {
    const states: GameState[] = ['OFFICER_INTRO', 'PASS', 'PACK', 'PACKED', 'HALL', 'INSPECT', 'GATE'];
    for (const target of states) {
      const fsm = setup();
      fsm.send({ type: 'start' });
      fsm.send({ type: 'open' });
      if (target !== 'OFFICER_INTRO') fsm.send({ type: 'tap' });
      if (target === 'PACK' || target === 'PACKED' || target === 'HALL' || target === 'INSPECT' || target === 'GATE') {
        fsm.send({ type: 'tap' });
      }
      if (target === 'PACKED' || target === 'HALL' || target === 'INSPECT' || target === 'GATE') {
        const travelers = fsm.context.round!.travelerIds.length;
        for (let i = 0; i < travelers; i++) {
          fsm.send({ type: 'closeSuitcase', amount: 0 });
          if (i < travelers - 1) fsm.send({ type: 'tap' });
        }
      }
      if (target === 'HALL' || target === 'INSPECT' || target === 'GATE') fsm.send({ type: 'tap' });
      if (target === 'INSPECT' || target === 'GATE') fsm.send({ type: 'endInterrogation' });
      if (target === 'GATE') fsm.send({ type: 'waveAll' });

      expect(fsm.state).toBe(target);
      expect(fsm.send({ type: 'cancel' })).toBe(true);
      expect(fsm.state).toBe('LOBBY');
      expect(fsm.context.round).toBeNull();
    }
  });

  it('fuehrt `quit` immer zum Titel und setzt die Rundenzaehlung zurueck', () => {
    const fsm = toHall(setup(), [1, 0, 0, 0]);
    expect(fsm.send({ type: 'quit' })).toBe(true);
    expect(fsm.state).toBe('TITLE');
    expect(fsm.context.roundIndex).toBe(0);
    expect(fsm.context.round).toBeNull();
  });
});

describe('Hooks und Listener', () => {
  it('ruft enter/exit und meldet Uebergaenge', () => {
    const seen: string[] = [];
    const fsm = setup();

    const offHook = fsm.on('LOBBY', {
      enter: (_ctx, from) => seen.push(`enter LOBBY from ${from}`),
      exit: (_ctx, to) => seen.push(`exit LOBBY to ${to}`),
    });
    const offListener = fsm.subscribe((transition) => seen.push(`${transition.from}→${transition.to}`));

    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });

    expect(seen).toEqual(['enter LOBBY from TITLE', 'TITLE→LOBBY', 'exit LOBBY to OFFICER_INTRO', 'LOBBY→OFFICER_INTRO']);

    offHook();
    offListener();
    fsm.send({ type: 'cancel' });
    expect(seen).toHaveLength(4);
  });

  it('haelt bei Selbstuebergaengen die Screen-Hooks still', () => {
    const fsm = toHall(setup({ players: 6 }), [1, 1, 0, 0, 0]);
    let entered = 0;
    fsm.on('INSPECT', { enter: () => (entered += 1) });

    fsm.send({ type: 'endInterrogation' });
    expect(entered).toBe(1);

    fsm.send({ type: 'inspectSuitcase', suitcaseOf: fsm.context.round!.travelerIds[0]! });
    fsm.send({ type: 'resultShown' });
    /* Zweiter Koffer, derselbe Screen — kein erneutes `enter`. */
    expect(entered).toBe(1);
    expect(fsm.state).toBe('INSPECT');
  });

  it('nimmt einen onTransition-Callback aus den Optionen an', () => {
    const seen: string[] = [];
    const fsm = createFsm({
      players: makePlayers(4),
      rng: rngFor(1),
      onTransition: (t) => seen.push(t.to),
    });
    fsm.send({ type: 'start' });
    expect(seen).toEqual(['LOBBY']);
  });
});

describe('Setter', () => {
  it('uebernimmt Spieler und Modi', () => {
    const fsm = setup();
    fsm.setPlayers(makePlayers(8));
    fsm.setModes(modeFlags({ sniffer: true }));

    expect(fsm.context.players).toHaveLength(8);
    expect(fsm.context.modes.sniffer).toBe(true);

    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    /* 8 Spieler → k = 3, Spuerhund zieht eine ab. */
    expect(fsm.context.round!.maxOpenings).toBe(2);
  });

  it('setzt den Reisenden-Index zurueck, wenn die Gruppe schrumpft', () => {
    const fsm = toFirstPack(setup({ players: 8 }));
    fsm.send({ type: 'closeSuitcase', amount: 0 });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'closeSuitcase', amount: 0 });
    expect(fsm.context.travelerIndex).toBe(2);

    fsm.setPlayers(makePlayers(2));
    expect(fsm.context.travelerIndex).toBe(0);
  });
});
