import { describe, expect, it, vi } from 'vitest';
import { createFsm, everyoneSealed, GAME_STATES, type Fsm, type GameState } from '@/core/fsm';
import { createSequencePicker } from '@/core/choreographer';
import { createSeededRng } from '@/core/rng';
import { noModes } from '@/core/modes';
import { defaultPlayers } from '@/core/session';
import type { Choice, PlayerId } from '@/core/types';

const rng = (seed: number) => createSeededRng(seed);

function fsmWith(playerCount = 4, modes = noModes()): Fsm {
  return createFsm({
    players: defaultPlayers(playerCount),
    modes,
    rng: rng(42),
    picker: createSequencePicker(42),
  });
}

/** Bis zum Choose-Screen des ersten Spielers. */
function toChoose(fsm: Fsm): Fsm {
  fsm.send({ type: 'start' });
  fsm.send({ type: 'go' });
  fsm.send({ type: 'ready' });
  fsm.send({ type: 'tap' });
  return fsm;
}

/**
 * Jeder nimmt einen anderen Balken, der auf DIESER Bruecke wirklich existiert.
 * Nach zwei friedlichen Runden sind die Nummern 1…n naemlich nicht mehr selbstverstaendlich.
 */
function sealPeacefully(fsm: Fsm): Fsm {
  const planks = [...fsm.context.bridge.planks];
  return sealAll(fsm, fsm.context.players.map((_, i) => ({ plank: planks[i]! })));
}

/** Alle waehlen der Reihe nach; `picks` ist eine Wahl pro Spieler. */
function sealAll(fsm: Fsm, picks: Choice[]): Fsm {
  for (const choice of picks) {
    fsm.send({ type: 'seal', choice });
    if (fsm.state === 'PASS') fsm.send({ type: 'tap' });
  }
  return fsm;
}

describe('Zustandsraum', () => {
  it('kennt alle States aus Architektur §3', () => {
    expect([...GAME_STATES]).toEqual([
      'TITLE',
      'LOBBY',
      'NEGOTIATION',
      'SILENCE',
      'PASS',
      'CHOOSE',
      'SEALED',
      'STEP',
      'DISTRIBUTE',
      'RESULT',
    ]);
  });

  it('startet im Titel und verwirft dort alles andere', () => {
    const fsm = fsmWith();
    expect(fsm.state).toBe('TITLE');
    expect(fsm.can('start')).toBe(true);
    expect(fsm.can('go')).toBe(false);
    expect(fsm.send({ type: 'go' })).toBe(false);
    expect(fsm.state).toBe('TITLE');
  });
});

describe('Lobby-Guard (GDD §3.1)', () => {
  it('startet nicht mit weniger als drei Spielern', () => {
    const fsm = createFsm({ players: defaultPlayers(2), rng: rng(1) });
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'go' })).toBe(false);
    expect(fsm.state).toBe('LOBBY');
  });

  it('startet nicht mit mehr als acht', () => {
    const fsm = createFsm({ players: [...defaultPlayers(8), ...defaultPlayers(1)], rng: rng(1) });
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'go' })).toBe(false);
  });

  it('baut beim Start eine frische Bruecke n + 2', () => {
    const fsm = fsmWith(5);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'go' });
    expect(fsm.state).toBe('NEGOTIATION');
    expect(fsm.context.bridge.count).toBe(7);
    expect(fsm.context.round?.choices).toEqual({});
  });
});

describe('Nebel-Pfad (GDD §3.6)', () => {
  it('ersetzt die Absprache durch Stille', () => {
    const fsm = fsmWith(4, { ...noModes(), fog: true });
    fsm.send({ type: 'start' });
    fsm.send({ type: 'go' });
    expect(fsm.state).toBe('SILENCE');

    fsm.send({ type: 'ready' });
    expect(fsm.state).toBe('PASS');
  });

  it('fuehrt auch die naechste Runde in die Stille', () => {
    const fsm = fsmWith(3, { ...noModes(), fog: true });
    toChoose(fsm);
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 3 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    fsm.send({ type: 'distributeNext', distribution: [{ from: 'p3', to: 'p1', sips: 1 }] });
    expect(fsm.state).toBe('RESULT');

    fsm.send({ type: 'nextRound' });
    expect(fsm.state).toBe('SILENCE');
  });
});

describe('Handy rumgeben', () => {
  it('geht Spieler fuer Spieler durch und endet bei SEALED', () => {
    const fsm = toChoose(fsmWith(3));
    expect(fsm.currentPlayer()).toBe('p1');

    fsm.send({ type: 'seal', choice: { plank: 1 } });
    expect(fsm.state).toBe('PASS');
    expect(fsm.currentPlayer()).toBe('p2');

    fsm.send({ type: 'tap' });
    fsm.send({ type: 'seal', choice: { plank: 2 } });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'seal', choice: { plank: 3 } });

    expect(fsm.state).toBe('SEALED');
    expect(fsm.currentPlayer()).toBeNull();
    expect(everyoneSealed(fsm.context)).toBe(true);
  });

  it('verwirft eine Wahl auf einen Balken, den es nicht gibt', () => {
    const fsm = toChoose(fsmWith(3));
    expect(fsm.send({ type: 'seal', choice: { plank: 99 } })).toBe(false);
    expect(fsm.state).toBe('CHOOSE');
  });

  it('verwirft das Seil, wenn der Modus aus ist', () => {
    const fsm = toChoose(fsmWith(3));
    expect(fsm.canTakeRope('p1')).toBe(false);
    expect(fsm.send({ type: 'seal', choice: { rope: true } })).toBe(false);
  });

  it('erlaubt das Seil genau einmal pro Spieler und Session', () => {
    const fsm = fsmWith(3, { ...noModes(), rope: true });
    toChoose(fsm);
    expect(fsm.canTakeRope('p1')).toBe(true);
    sealAll(fsm, [{ rope: true }, { plank: 1 }, { plank: 1 }]);

    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    while (fsm.state === 'DISTRIBUTE') {
      fsm.send({ type: 'distributeNext', distribution: [] });
    }
    fsm.send({ type: 'nextRound' });

    expect(fsm.context.ropeUsage).toEqual({ p1: 1 });
    expect(fsm.canTakeRope('p1')).toBe(false);
    expect(fsm.canTakeRope('p2')).toBe(true);

    fsm.send({ type: 'ready' });
    fsm.send({ type: 'tap' });
    expect(fsm.send({ type: 'seal', choice: { rope: true } })).toBe(false);
  });
});

describe('Die eine Abrechnung (Architektur §3)', () => {
  it('laeuft genau einmal, beim Uebergang SEALED → STEP', () => {
    const fsm = toChoose(fsmWith(4));
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 3 }, { plank: 4 }]);

    expect(fsm.resolveCount).toBe(0);
    expect(fsm.context.result).toBeNull();

    fsm.send({ type: 'tap' });
    expect(fsm.state).toBe('STEP');
    expect(fsm.resolveCount).toBe(1);
    expect(fsm.context.result?.outcome).toBe('collision');

    /* Die Show darf nichts mehr entscheiden. */
    fsm.send({ type: 'showFinished' });
    expect(fsm.resolveCount).toBe(1);
  });

  it('zaehlt pro Runde einmal — auch ueber mehrere Runden', () => {
    const fsm = toChoose(fsmWith(3));
    for (let round = 1; round <= 3; round += 1) {
      sealPeacefully(fsm);
      fsm.send({ type: 'tap' });
      expect(fsm.resolveCount).toBe(round);
      fsm.send({ type: 'showFinished' });
      fsm.send({ type: 'nextRound' });
      fsm.send({ type: 'ready' });
      fsm.send({ type: 'tap' });
    }
  });
});

describe('Verteilen (ADR-5)', () => {
  it('ueberspringt den Screen, wenn niemand verteilt', () => {
    const fsm = toChoose(fsmWith(3));
    sealAll(fsm, [{ plank: 1 }, { plank: 2 }, { plank: 3 }]);
    fsm.send({ type: 'tap' });

    expect(fsm.context.givers).toEqual([]);
    fsm.send({ type: 'showFinished' });
    expect(fsm.state).toBe('RESULT');
    expect(fsm.currentGiver()).toBeNull();
  });

  it('nimmt den Schnellmodus, wenn alle Guthaben 1 sind', () => {
    const fsm = toChoose(fsmWith(4));
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 3 }, { plank: 4 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });

    expect(fsm.state).toBe('DISTRIBUTE');
    expect(fsm.context.distributeMode).toBe('quick');
    expect(fsm.context.givers).toEqual(['p3', 'p4']);
    expect(fsm.currentGiver()).toBe('p3');
  });

  it('iteriert in der Todeszone, weil dort jeder 2 verteilt', () => {
    const fsm = fsmWith(3);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'go' });
    /* Bruecke von Hand in die Todeszone bringen. */
    fsm.context.bridge.count = 2;
    fsm.context.bridge.planks = [1, 2];
    fsm.context.round!.bridge = fsm.context.bridge;
    fsm.send({ type: 'ready' });
    fsm.send({ type: 'tap' });
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 2 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });

    expect(fsm.context.distributeMode).toBe('iterate');
    expect(fsm.context.result?.giving).toEqual({ p3: 2 });
  });

  it('sammelt die Verteilungen ein und geht danach ins Result', () => {
    const fsm = toChoose(fsmWith(4));
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 3 }, { plank: 4 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });

    fsm.send({ type: 'distributeNext', distribution: [{ from: 'p3', to: 'p1', sips: 1 }] });
    expect(fsm.state).toBe('DISTRIBUTE');
    expect(fsm.currentGiver()).toBe('p4');

    fsm.send({ type: 'distributeNext', distribution: [{ from: 'p4', to: 'p2', sips: 1 }] });
    expect(fsm.state).toBe('RESULT');
    expect(fsm.context.result?.distribution).toEqual([
      { from: 'p3', to: 'p1', sips: 1 },
      { from: 'p4', to: 'p2', sips: 1 },
    ]);
  });
});

describe('Runden-Uebergang', () => {
  it('uebernimmt die geschrumpfte Bruecke in die naechste Runde', () => {
    const fsm = toChoose(fsmWith(3));
    expect(fsm.context.bridge.count).toBe(5);

    sealAll(fsm, [{ plank: 1 }, { plank: 2 }, { plank: 3 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    fsm.send({ type: 'nextRound' });

    expect(fsm.state).toBe('NEGOTIATION');
    expect(fsm.context.bridge.count).toBe(4);
    expect(fsm.context.roundIndex).toBe(1);
    expect(fsm.context.round?.index).toBe(1);
  });

  it('uebernimmt die reparierte Bruecke nach einem Krach', () => {
    const fsm = toChoose(fsmWith(3));
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 3 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    fsm.send({ type: 'distributeNext', distribution: [] });
    fsm.send({ type: 'nextRound' });

    expect(fsm.context.bridge.count).toBe(5);
  });

  it('geht ueber "Spieler ändern" in die Lobby und raeumt die Runde ab', () => {
    const fsm = toChoose(fsmWith(3));
    sealAll(fsm, [{ plank: 1 }, { plank: 2 }, { plank: 3 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    fsm.send({ type: 'changePlayers' });

    expect(fsm.state).toBe('LOBBY');
    expect(fsm.context.round).toBeNull();
    expect(fsm.context.result).toBeNull();
  });
});

describe('Abbrechen und Beenden', () => {
  const cancellable: GameState[] = ['NEGOTIATION', 'PASS', 'CHOOSE', 'SEALED', 'STEP'];

  it('bricht aus jedem Runden-State in die Lobby ab', () => {
    for (const target of cancellable) {
      const fsm = toChoose(fsmWith(3));
      if (target === 'NEGOTIATION') {
        const fresh = fsmWith(3);
        fresh.send({ type: 'start' });
        fresh.send({ type: 'go' });
        expect(fresh.send({ type: 'cancel' })).toBe(true);
        expect(fresh.state).toBe('LOBBY');
        continue;
      }
      if (target === 'PASS') {
        fsm.send({ type: 'seal', choice: { plank: 1 } });
      }
      if (target === 'SEALED' || target === 'STEP') {
        sealAll(fsm, [{ plank: 1 }, { plank: 2 }, { plank: 3 }]);
      }
      if (target === 'STEP') fsm.send({ type: 'tap' });

      expect(fsm.state).toBe(target);
      expect(fsm.send({ type: 'cancel' })).toBe(true);
      expect(fsm.state).toBe('LOBBY');
      expect(fsm.context.round).toBeNull();
    }
  });

  it('beendet in den Titel und setzt den Rundenzaehler zurueck', () => {
    const fsm = toChoose(fsmWith(3));
    sealAll(fsm, [{ plank: 1 }, { plank: 2 }, { plank: 3 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    fsm.send({ type: 'nextRound' });
    expect(fsm.context.roundIndex).toBe(1);

    fsm.send({ type: 'quit' });
    expect(fsm.state).toBe('TITLE');
    expect(fsm.context.roundIndex).toBe(0);
  });

  it('laesst sich im Verteilen nicht abbrechen — die Schlucke sind schon verteilt', () => {
    const fsm = toChoose(fsmWith(4));
    sealAll(fsm, [{ plank: 1 }, { plank: 1 }, { plank: 3 }, { plank: 4 }]);
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'showFinished' });
    expect(fsm.send({ type: 'cancel' })).toBe(false);
  });
});

describe('Fahne und Gewicht ueber die FSM', () => {
  it('Fahnen nur waehrend der Absprache', () => {
    const fsm = fsmWith(3, { ...noModes(), flags: true });
    expect(fsm.raiseFlag('p1', 2)).toBe(false);

    fsm.send({ type: 'start' });
    fsm.send({ type: 'go' });
    expect(fsm.raiseFlag('p1', 2)).toBe(true);
    expect(fsm.context.round?.flags).toEqual({ p1: 2 });
    expect(fsm.lowerFlag('p1')).toBe(true);
    expect(fsm.context.round?.flags).toEqual({});

    fsm.send({ type: 'ready' });
    expect(fsm.raiseFlag('p1', 2)).toBe(false);
    expect(fsm.lowerFlag('p1')).toBe(false);
  });

  it('Gewicht nur auf dem eigenen Choose-Screen', () => {
    const fsm = fsmWith(3, { ...noModes(), weights: true });
    expect(fsm.chooseWeight('p1', 3)).toBe(false);

    toChoose(fsm);
    expect(fsm.chooseWeight('p1', 3)).toBe(true);
    expect(fsm.context.round?.weights).toEqual({ p1: 3 });
  });
});

describe('Spieler und Modi aendern', () => {
  it('baut die Bruecke neu, wenn jemand dazukommt', () => {
    const fsm = fsmWith(3);
    fsm.setPlayers(defaultPlayers(6));
    expect(fsm.context.bridge.count).toBe(8);
  });

  it('faellt auf eine gueltige Bruecke zurueck, wenn zu wenige uebrig sind', () => {
    const fsm = fsmWith(5);
    fsm.setPlayers(defaultPlayers(2));
    expect(fsm.context.bridge.count).toBe(5);
  });

  it('setzt den Spieler-Index zurueck, wenn die Liste kuerzer wird', () => {
    const fsm = toChoose(fsmWith(5));
    fsm.send({ type: 'seal', choice: { plank: 1 } });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'seal', choice: { plank: 2 } });
    expect(fsm.context.playerIndex).toBe(2);

    fsm.setPlayers(defaultPlayers(3));
    expect(fsm.context.playerIndex).toBe(2);
    fsm.setPlayers(defaultPlayers(2));
    expect(fsm.context.playerIndex).toBe(0);
  });

  it('uebernimmt neue Modi', () => {
    const fsm = fsmWith(3);
    fsm.setModes({ ...noModes(), fog: true });
    expect(fsm.context.modes.fog).toBe(true);
  });
});

describe('Hooks und Abonnenten', () => {
  it('ruft enter und exit in der richtigen Reihenfolge', () => {
    const calls: string[] = [];
    const fsm = fsmWith(3);

    fsm.on('LOBBY', {
      enter: (_ctx, from) => calls.push(`enter LOBBY von ${from}`),
      exit: (_ctx, to) => calls.push(`exit LOBBY nach ${to}`),
    });
    /* Zweites Hook-Paar auf demselben State — beide muessen laufen. */
    const off = fsm.on('LOBBY', { enter: () => calls.push('zweiter Hook') });

    fsm.send({ type: 'start' });
    fsm.send({ type: 'go' });
    expect(calls).toEqual(['enter LOBBY von TITLE', 'zweiter Hook', 'exit LOBBY nach NEGOTIATION']);

    off();
    fsm.send({ type: 'cancel' });
    expect(calls.filter((c) => c === 'zweiter Hook')).toHaveLength(1);
  });

  it('benachrichtigt Abonnenten und laesst sie sich abmelden', () => {
    const seen: string[] = [];
    const listener = vi.fn((t: { from: string; to: string }) => seen.push(`${t.from}→${t.to}`));
    const fsm = createFsm({ players: defaultPlayers(3), rng: rng(1), onTransition: listener });

    const off = fsm.subscribe((t) => seen.push(`abo ${t.to}`));
    fsm.send({ type: 'start' });
    expect(seen).toEqual(['TITLE→LOBBY', 'abo LOBBY']);

    off();
    fsm.send({ type: 'go' });
    expect(seen.filter((s) => s.startsWith('abo'))).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('kommt ohne Optionen aus', () => {
    const fsm = createFsm();
    expect(fsm.state).toBe('TITLE');
    expect(fsm.context.players).toEqual([]);
    expect(fsm.context.modes).toEqual(noModes());
    expect(fsm.context.bridge.count).toBe(5);
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'go' })).toBe(false);
  });

  it('everyoneSealed ist ohne Runde false', () => {
    expect(everyoneSealed(createFsm().context)).toBe(false);
  });
});

describe('Spielerreihenfolge', () => {
  it('gibt das Handy in Lobby-Reihenfolge weiter', () => {
    const fsm = toChoose(fsmWith(5));
    const order: (PlayerId | null)[] = [];

    for (let i = 0; i < 5; i += 1) {
      order.push(fsm.currentPlayer());
      fsm.send({ type: 'seal', choice: { plank: i + 1 } });
      if (fsm.state === 'PASS') fsm.send({ type: 'tap' });
    }
    expect(order).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });
});
