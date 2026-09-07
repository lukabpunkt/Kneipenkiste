/**
 * Game-State-Machine (Architektur §3, Audit A0: 100 % Branch-Coverage).
 *
 * Jeder Pfeil des Diagramms bekommt einen Test, dazu die Guards, die verbotenen Events
 * je State und die wichtigste Zusicherung des Projekts: `resolveRound` laeuft **genau
 * einmal** pro Runde.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '@/config/rules';
import {
  createFsm,
  GAME_STATES,
  type Fsm,
  type FsmContext,
  type GameEventType,
  type GameState,
} from '@/core/fsm';
import { applyDistribution, type resolveRound } from '@/core/payout';
import { makePlayers, makeSettings } from './helpers';

/** Ein Spiel mit vier Spielern, festem Seed und ohne Modi. */
function makeFsm(settings: Settings = DEFAULT_SETTINGS, players = 4): Fsm {
  return createFsm({
    players: makePlayers(players),
    settings,
    makeSeed: () => 1234,
  });
}

/** Bringt die FSM bis zum Ende der geheimen Wahl. */
function playToSealed(fsm: Fsm, steals: readonly boolean[]): void {
  fsm.send({ type: 'start' });
  fsm.send({ type: 'open' });
  fsm.send({ type: 'proceed' });
  for (const steal of steals) {
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'choose', choice: steal ? 'steal' : 'share' });
  }
}

describe('Startzustand', () => {
  it('beginnt im TITLE', () => {
    expect(makeFsm().state).toBe('TITLE');
  });

  it('setzt den Tresor auf V_0 der eingestellten Haerte', () => {
    expect(makeFsm(makeSettings({ hardness: 'hard' })).context.vault).toBe(6);
    expect(createFsm({ settings: DEFAULT_SETTINGS, vault: 11 }).context.vault).toBe(11);
  });

  it('startet ohne Spieler, wenn keine uebergeben werden', () => {
    expect(createFsm({ settings: DEFAULT_SETTINGS }).context.players).toEqual([]);
  });
});

describe('TITLE → LOBBY', () => {
  it('per start', () => {
    const fsm = makeFsm();
    expect(fsm.send({ type: 'start' })).toBe(true);
    expect(fsm.state).toBe('LOBBY');
  });
});

describe('LOBBY → NEGOTIATION', () => {
  it('ab 3 Spielern (ADR-5)', () => {
    const fsm = makeFsm(DEFAULT_SETTINGS, 3);
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'open' })).toBe(true);
    expect(fsm.state).toBe('NEGOTIATION');
  });

  it('nicht mit zweien', () => {
    const fsm = makeFsm(DEFAULT_SETTINGS, 2);
    fsm.send({ type: 'start' });
    expect(fsm.send({ type: 'open' })).toBe(false);
    expect(fsm.state).toBe('LOBBY');
  });

  it('legt die Runde an', () => {
    const fsm = makeFsm();
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.context.setup).toMatchObject({ index: 1, vault: 4, seed: 1234, oaths: [], choices: {} });
    expect(fsm.context.result).toBeNull();
  });
});

describe('Nachtschicht', () => {
  const night = makeSettings({}, { nightShift: true });

  it('geht in SILENCE statt NEGOTIATION', () => {
    const fsm = makeFsm(night);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.state).toBe('SILENCE');
  });

  it('und von dort ganz normal weiter', () => {
    const fsm = makeFsm(night);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.send({ type: 'proceed' })).toBe(true);
    expect(fsm.state).toBe('PASS');
  });

  it('auch fuer die naechste Runde', () => {
    const fsm = makeFsm(night);
    playToSealed(fsm, [false, false, false, false]);
    fsm.send({ type: 'reveal' });
    fsm.send({ type: 'showFinished' });
    fsm.send({ type: 'nextRound' });
    expect(fsm.state).toBe('SILENCE');
  });
});

describe('PASS ↔ CHOICE', () => {
  it('reicht das Handy von Spieler zu Spieler', () => {
    const fsm = makeFsm();
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    fsm.send({ type: 'proceed' });
    expect(fsm.state).toBe('PASS');
    expect(fsm.context.playerIndex).toBe(0);

    fsm.send({ type: 'tap' });
    expect(fsm.state).toBe('CHOICE');
    fsm.send({ type: 'choose', choice: 'share' });
    expect(fsm.state).toBe('PASS');
    expect(fsm.context.playerIndex).toBe(1);
  });

  it('geht nach dem letzten Spieler nach SEALED', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [false, false, false, false]);
    expect(fsm.state).toBe('SEALED');
    expect(Object.keys(fsm.context.setup!.choices)).toHaveLength(4);
  });

  it('merkt sich jede Wahl', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [true, false, true, false]);
    expect(fsm.context.setup!.choices).toEqual({
      p0: 'steal',
      p1: 'share',
      p2: 'steal',
      p3: 'share',
    });
  });

  it('erzwingt beim Maulwurf STEHLEN, egal was getippt wird', () => {
    const fsm = createFsm({
      players: makePlayers(4),
      settings: makeSettings({}, { mole: true }),
      makeSeed: () => 1,
    });
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    const moleId = fsm.context.setup!.moleId!;
    expect(moleId).toBeDefined();

    fsm.send({ type: 'proceed' });
    for (let i = 0; i < 4; i++) {
      fsm.send({ type: 'tap' });
      fsm.send({ type: 'choose', choice: 'share' });
    }
    expect(fsm.context.setup!.choices[moleId]).toBe('steal');
  });

  it('wirft, wenn ohne laufende Runde gewaehlt wird', () => {
    const fsm = makeFsm();
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    fsm.send({ type: 'proceed' });
    fsm.send({ type: 'tap' });
    mutable(fsm).setup = null;
    expect(() => fsm.send({ type: 'choose', choice: 'share' })).toThrow(/keine Runde/);
  });
});

describe('SEALED → REVEAL', () => {
  it('loest genau einmal auf', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [true, false, false, false]);
    expect(fsm.resolveCount).toBe(0);

    fsm.send({ type: 'reveal' });
    expect(fsm.state).toBe('REVEAL');
    expect(fsm.resolveCount).toBe(1);
    expect(fsm.context.result?.outcome).toBe('soloSteal');
  });

  it('loest ueber drei Runden genau dreimal auf', () => {
    const fsm = makeFsm();
    for (let round = 0; round < 3; round++) {
      if (round === 0) playToSealed(fsm, [false, false, false, false]);
      else {
        fsm.send({ type: 'nextRound' });
        fsm.send({ type: 'proceed' });
        for (let i = 0; i < 4; i++) {
          fsm.send({ type: 'tap' });
          fsm.send({ type: 'choose', choice: 'share' });
        }
      }
      fsm.send({ type: 'reveal' });
      fsm.send({ type: 'showFinished' });
    }
    expect(fsm.resolveCount).toBe(3);
    expect(fsm.context.roundNumber).toBe(3);
  });

  it('loest nicht auf, wer aus SEALED abbricht', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [false, false, false, false]);
    fsm.send({ type: 'cancel' });
    expect(fsm.state).toBe('LOBBY');
    expect(fsm.resolveCount).toBe(0);
    expect(fsm.context.setup).toBeNull();
  });

  it('nutzt die injizierte Aufloesung', () => {
    const resolve = vi.fn<typeof resolveRound>(() => ({ outcome: 'allShare', nextVault: 6 }) as never);
    const fsm = createFsm({ players: makePlayers(3), settings: DEFAULT_SETTINGS, resolve });
    playToSealed(fsm, [false, false, false]);
    fsm.send({ type: 'reveal' });
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve.mock.calls[0]![0]).toEqual(['p0', 'p1', 'p2']);
  });

  it('wirft, wenn die Runde verschwunden ist', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [false, false, false, false]);
    mutable(fsm).setup = null;
    expect(() => fsm.send({ type: 'reveal' })).toThrow(/keine Runde/);
  });
});

describe('REVEAL → DISTRIBUTE | RESULT', () => {
  it('geht beim Alleingang ueber DISTRIBUTE', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [true, false, false, false]);
    fsm.send({ type: 'reveal' });
    fsm.send({ type: 'showFinished' });
    expect(fsm.state).toBe('DISTRIBUTE');
  });

  it('geht sonst direkt zum Result', () => {
    for (const steals of [
      [false, false, false, false],
      [true, true, false, false],
      [true, true, true, true],
    ]) {
      const fsm = makeFsm();
      playToSealed(fsm, steals);
      fsm.send({ type: 'reveal' });
      fsm.send({ type: 'showFinished' });
      expect(fsm.state).toBe('RESULT');
    }
  });

  it('zaehlt die Runde und setzt den Tresor fort', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [false, false, false, false]);
    fsm.send({ type: 'reveal' });
    fsm.send({ type: 'showFinished' });
    expect(fsm.context.roundNumber).toBe(1);
    expect(fsm.context.vault).toBe(6); // 4 + 2
  });

  it('wirft, wenn die Show ohne Ergebnis endet', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [false, false, false, false]);
    fsm.send({ type: 'reveal' });
    mutable(fsm).result = null;
    expect(() => fsm.send({ type: 'showFinished' })).toThrow(/nie aufgeloest/);
  });
});

describe('DISTRIBUTE → RESULT', () => {
  it('uebernimmt das ergaenzte Ergebnis', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [true, false, false, false]);
    fsm.send({ type: 'reveal' });
    fsm.send({ type: 'showFinished' });

    const withDistribution = applyDistribution(fsm.context.result!, { p1: 4, p2: 0, p3: 0 });
    expect(fsm.send({ type: 'payout', result: withDistribution })).toBe(true);
    expect(fsm.state).toBe('RESULT');
    expect(fsm.context.result!.drinkers).toHaveLength(1);
  });

  it('kennt kein Abbrechen — die Schluecke sind faellig', () => {
    const fsm = makeFsm();
    playToSealed(fsm, [true, false, false, false]);
    fsm.send({ type: 'reveal' });
    fsm.send({ type: 'showFinished' });
    expect(fsm.send({ type: 'cancel' })).toBe(false);
    expect(fsm.state).toBe('DISTRIBUTE');
  });
});

describe('RESULT', () => {
  const toResult = (): Fsm => {
    const fsm = makeFsm();
    playToSealed(fsm, [false, false, false, false]);
    fsm.send({ type: 'reveal' });
    fsm.send({ type: 'showFinished' });
    return fsm;
  };

  it('startet die naechste Runde mit dem gewachsenen Tresor', () => {
    const fsm = toResult();
    fsm.send({ type: 'nextRound' });
    expect(fsm.state).toBe('NEGOTIATION');
    expect(fsm.context.setup).toMatchObject({ index: 2, vault: 6 });
  });

  it('geht zurueck in die Lobby', () => {
    const fsm = toResult();
    fsm.send({ type: 'changePlayers' });
    expect(fsm.state).toBe('LOBBY');
  });
});

describe('Abbrechen (Back-Dialog, Architektur §3)', () => {
  const states: GameState[] = ['NEGOTIATION', 'PASS', 'CHOICE', 'SEALED', 'REVEAL'];

  for (const state of states) {
    it(`aus ${state} zurueck in die Lobby`, () => {
      const fsm = makeFsm();
      fsm.send({ type: 'start' });
      fsm.send({ type: 'open' });
      if (state !== 'NEGOTIATION') {
        fsm.send({ type: 'proceed' });
        if (state !== 'PASS') fsm.send({ type: 'tap' });
        if (state === 'SEALED' || state === 'REVEAL') {
          fsm.send({ type: 'choose', choice: 'share' });
          for (let i = 1; i < 4; i++) {
            fsm.send({ type: 'tap' });
            fsm.send({ type: 'choose', choice: 'share' });
          }
        }
        if (state === 'REVEAL') fsm.send({ type: 'reveal' });
      }
      expect(fsm.state).toBe(state);
      expect(fsm.send({ type: 'cancel' })).toBe(true);
      expect(fsm.state).toBe('LOBBY');
      expect(fsm.context.setup).toBeNull();
      expect(fsm.context.result).toBeNull();
      expect(fsm.context.playerIndex).toBe(0);
    });
  }

  it('geht auch aus SILENCE', () => {
    const fsm = makeFsm(makeSettings({}, { nightShift: true }));
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.send({ type: 'cancel' })).toBe(true);
    expect(fsm.state).toBe('LOBBY');
  });
});

describe('Unzulaessige Events', () => {
  const ALL: GameEventType[] = [
    'start',
    'open',
    'proceed',
    'tap',
    'choose',
    'reveal',
    'showFinished',
    'payout',
    'nextRound',
    'changePlayers',
    'cancel',
  ];

  const ALLOWED: Record<GameState, GameEventType[]> = {
    TITLE: ['start'],
    LOBBY: ['open'],
    NEGOTIATION: ['proceed', 'cancel'],
    SILENCE: ['proceed', 'cancel'],
    PASS: ['tap', 'cancel'],
    CHOICE: ['choose', 'cancel'],
    SEALED: ['reveal', 'cancel'],
    REVEAL: ['showFinished', 'cancel'],
    WITNESS: ['payout'],
    DISTRIBUTE: ['payout'],
    RESULT: ['nextRound', 'changePlayers'],
  };

  it('deckt alle States ab', () => {
    expect(Object.keys(ALLOWED).sort()).toEqual([...GAME_STATES].sort());
  });

  for (const state of GAME_STATES) {
    it(`${state}: can() stimmt mit der Tabelle ueberein`, () => {
      const fsm = makeFsm();
      driveTo(fsm, state);
      for (const event of ALL) {
        expect(fsm.can(event)).toBe(ALLOWED[state].includes(event));
      }
    });
  }

  it('lehnt ein Event im falschen State ab, ohne den Zustand anzufassen', () => {
    const fsm = makeFsm();
    expect(fsm.send({ type: 'proceed' })).toBe(false);
    expect(fsm.state).toBe('TITLE');
  });
});

describe('Setter', () => {
  let fsm: Fsm;
  beforeEach(() => {
    fsm = makeFsm();
  });

  it('setPlayers tauscht die Runde aus und faengt den Index ab', () => {
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    fsm.send({ type: 'proceed' });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'choose', choice: 'share' });
    expect(fsm.context.playerIndex).toBe(1);

    fsm.setPlayers(makePlayers(1));
    expect(fsm.context.playerIndex).toBe(0);
    expect(fsm.context.players).toHaveLength(1);
  });

  it('setPlayers laesst einen gueltigen Index in Ruhe', () => {
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    fsm.send({ type: 'proceed' });
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'choose', choice: 'share' });
    fsm.setPlayers(makePlayers(4));
    expect(fsm.context.playerIndex).toBe(1);
  });

  it('setSettings passt den Tresor in TITLE/LOBBY an', () => {
    fsm.setSettings(makeSettings({ hardness: 'hard' }));
    expect(fsm.context.vault).toBe(6);
    fsm.send({ type: 'start' });
    fsm.setSettings(makeSettings({ hardness: 'soft' }));
    expect(fsm.context.vault).toBe(3);
  });

  it('setSettings ruehrt einen laufenden Tresor nicht an', () => {
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    fsm.setSettings(makeSettings({ hardness: 'hard' }));
    expect(fsm.context.vault).toBe(4);
  });
});

describe('toggleOath', () => {
  const oath = makeSettings({}, { oath: true });

  it('setzt und nimmt den Schwur zurueck', () => {
    const fsm = makeFsm(oath);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.toggleOath('p1')).toBe(true);
    expect(fsm.context.setup!.oaths).toEqual(['p1']);
    expect(fsm.toggleOath('p1')).toBe(true);
    expect(fsm.context.setup!.oaths).toEqual([]);
  });

  it('geht nur in der Verhandlung', () => {
    const fsm = makeFsm(oath);
    expect(fsm.toggleOath('p1')).toBe(false);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    fsm.send({ type: 'proceed' });
    expect(fsm.toggleOath('p1')).toBe(false);
  });

  it('geht nur im Eid-Modus', () => {
    const fsm = makeFsm();
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.toggleOath('p1')).toBe(false);
    expect(fsm.context.setup!.oaths).toEqual([]);
  });
});

describe('Hooks und Abonnements', () => {
  it('ruft enter und exit mit den richtigen Nachbarn', () => {
    const fsm = makeFsm();
    const enter = vi.fn();
    const exit = vi.fn();
    fsm.on('LOBBY', { enter });
    fsm.on('TITLE', { exit });

    fsm.send({ type: 'start' });
    expect(enter).toHaveBeenCalledWith(fsm.context, 'TITLE');
    expect(exit).toHaveBeenCalledWith(fsm.context, 'LOBBY');
  });

  it('kommt mit Hooks ohne enter/exit klar', () => {
    const fsm = makeFsm();
    fsm.on('LOBBY', {});
    expect(() => fsm.send({ type: 'start' })).not.toThrow();
  });

  it('meldet Hooks wieder ab', () => {
    const fsm = makeFsm();
    const enter = vi.fn();
    const off = fsm.on('LOBBY', { enter });
    off();
    fsm.send({ type: 'start' });
    expect(enter).not.toHaveBeenCalled();
  });

  it('benachrichtigt Abonnenten ueber jeden Uebergang', () => {
    const listener = vi.fn();
    const fsm = makeFsm();
    const off = fsm.subscribe(listener);
    fsm.send({ type: 'start' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'TITLE', to: 'LOBBY', event: { type: 'start' } })
    );
    off();
    fsm.send({ type: 'open' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('nimmt onTransition aus den Optionen an', () => {
    const onTransition = vi.fn();
    const fsm = createFsm({ players: makePlayers(3), settings: DEFAULT_SETTINGS, onTransition });
    fsm.send({ type: 'start' });
    expect(onTransition).toHaveBeenCalledTimes(1);
  });
});

/**
 * Die Tests unten manipulieren den Kontext absichtlich, um die Notbremsen der FSM
 * auszuloesen. Produktiv ist er `Readonly` — hier nicht.
 */
function mutable(fsm: Fsm): FsmContext {
  return fsm.context as FsmContext;
}

/** Faehrt die FSM in einen beliebigen State. */
function driveTo(fsm: Fsm, state: GameState): void {
  if (state === 'TITLE') return;
  fsm.send({ type: 'start' });
  if (state === 'LOBBY') return;
  fsm.send({ type: 'open' });
  if (state === 'NEGOTIATION' || state === 'SILENCE') return;
  fsm.send({ type: 'proceed' });
  if (state === 'PASS') return;
  fsm.send({ type: 'tap' });
  if (state === 'CHOICE') return;

  /*
   * Wieviele stehlen, entscheidet der Zielzustand: einer fuer die Verteil-UI, zwei fuer
   * den Kronzeugen, sonst keiner. Der Kronzeuge braucht ausserdem den Modus.
   */
  const thieves = state === 'DISTRIBUTE' ? 1 : state === 'WITNESS' ? 2 : 0;
  if (state === 'WITNESS') {
    fsm.setSettings({ ...fsm.context.settings, modes: { ...fsm.context.settings.modes, witness: true } });
  }

  fsm.send({ type: 'choose', choice: thieves > 0 ? 'steal' : 'share' });
  for (let i = 1; i < fsm.context.players.length; i++) {
    fsm.send({ type: 'tap' });
    fsm.send({ type: 'choose', choice: i < thieves ? 'steal' : 'share' });
  }
  if (state === 'SEALED') return;
  fsm.send({ type: 'reveal' });
  if (state === 'REVEAL') return;
  fsm.send({ type: 'showFinished' });
}

describe('setVault', () => {
  it('uebernimmt den Tresorstand aus der Session', () => {
    const fsm = makeFsm();
    fsm.setVault(12);
    expect(fsm.context.vault).toBe(12);

    // Die naechste Runde startet mit genau diesem Stand.
    fsm.send({ type: 'start' });
    fsm.send({ type: 'open' });
    expect(fsm.context.setup?.vault).toBe(12);
  });
});
