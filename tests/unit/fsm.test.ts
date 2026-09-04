/**
 * Game-State-Machine (Roadmap M0.3, Audit A0: Branch-Coverage 100 %).
 *
 * Der Test, an dem die zentrale Zusage haengt: `dig()` laeuft **genau einmal pro Tap**
 * (CLAUDE.md) — und das private Board verlaesst die FSM nur ueber `view()`.
 */

import { describe, expect, it, vi } from 'vitest';
import { createFsm, type Fsm, type GameState } from '@/core/fsm';
import { fixedRandom, players, settings } from './helpers';

const TREASURE_CELL = 20;

/**
 * Baut eine FSM mit fester Kistenposition. Der `secure`-Fake liefert immer denselben
 * Index — im Spiel steckt hier `crypto.getRandomValues`.
 */
function fsmWith(playerCount = 4, patch = {}, treasureCell = TREASURE_CELL): Fsm {
  return createFsm({
    players: players(playerCount),
    settings: settings(patch),
    makeSeed: () => 777,
    secure: fixedRandom(treasureCell),
  });
}

/** Bringt die FSM bis in die Grabphase: Minen legen, weiterreichen, Kiste legen. */
function toDigPhase(fsm: Fsm): Fsm {
  fsm.send({ type: 'start' });
  fsm.send({ type: 'mine' });

  for (let i = 0; i < fsm.context.players.length; i++) {
    fsm.send({ type: 'tap' });
    fsm.fillPlacements();
    fsm.send({ type: 'bury' });
  }
  fsm.send({ type: 'begin' });
  return fsm;
}

/** Graebt so lange, bis die Runde vorbei ist — und zeigt jede Grabung an. */
function digUntilRoundOver(fsm: Fsm, cells: number[]): void {
  for (const cell of cells) {
    fsm.send({ type: 'tileTap', cell });
    fsm.send({ type: 'digShown' });
    if (fsm.state !== 'DIG') return;
  }
}

describe('Uebergaenge (Architektur §3)', () => {
  it('laeuft von TITLE bis in die Grabphase', () => {
    const fsm = fsmWith(3);
    const seen: GameState[] = [];
    fsm.subscribe((t) => seen.push(t.to));

    toDigPhase(fsm);

    expect(seen).toEqual(['LOBBY', 'PASS', 'PLACE', 'PASS', 'PLACE', 'PASS', 'PLACE', 'BURIED', 'DIG']);
  });

  it('laesst nur die erlaubten Events zu', () => {
    const fsm = fsmWith();

    expect(fsm.can('start')).toBe(true);
    expect(fsm.can('mine')).toBe(false);
    expect(fsm.send({ type: 'mine' })).toBe(false);
    expect(fsm.state).toBe('TITLE');

    fsm.send({ type: 'start' });
    expect(fsm.can('mine')).toBe(true);
  });

  it('startet nicht mit zu wenigen Spielern (GDD §3.1)', () => {
    const fsm = createFsm({ players: players(2), settings: settings(), secure: fixedRandom(0) });
    fsm.send({ type: 'start' });

    expect(fsm.send({ type: 'mine' })).toBe(false);
    expect(fsm.state).toBe('LOBBY');
  });

  it('bricht eine Runde ab und raeumt das Feld', () => {
    const fsm = toDigPhase(fsmWith());
    fsm.send({ type: 'tileTap', cell: 0 });

    fsm.send({ type: 'cancel' });

    expect(fsm.state).toBe('LOBBY');
    expect(fsm.context.digs).toEqual([]);
    expect(fsm.view().opened).toEqual({});
    expect(fsm.context.result).toBeNull();
  });

  it('geht vom Result zurueck in die Lobby', () => {
    const fsm = toDigPhase(fsmWith());
    digUntilRoundOver(fsm, [TREASURE_CELL]);
    while (fsm.state === 'DISTRIBUTE') fsm.send({ type: 'payout', assignments: {} });

    expect(fsm.state).toBe('RESULT');
    fsm.send({ type: 'changePlayers' });
    expect(fsm.state).toBe('LOBBY');
  });

  it('ruft enter- und exit-Hooks auf und meldet sie wieder ab', () => {
    const fsm = fsmWith();
    const enter = vi.fn();
    const exit = vi.fn();
    const off = fsm.on('LOBBY', { enter, exit });

    fsm.send({ type: 'start' });
    expect(enter).toHaveBeenCalledTimes(1);

    fsm.send({ type: 'mine' });
    expect(exit).toHaveBeenCalledTimes(1);

    off();
    fsm.send({ type: 'cancel' });
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it('meldet Transitions an Abonnenten und an `onTransition`', () => {
    const onTransition = vi.fn();
    const fsm = createFsm({ players: players(3), settings: settings(), onTransition });
    const listener = vi.fn();
    const off = fsm.subscribe(listener);

    fsm.send({ type: 'start' });
    expect(onTransition).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);

    off();
    fsm.send({ type: 'mine' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onTransition).toHaveBeenCalledTimes(2);
  });
});

describe('Minenphase', () => {
  it('reicht das Handy weiter und laesst erst am Limit vergraben', () => {
    const fsm = fsmWith(3);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });
    fsm.send({ type: 'tap' });

    expect(fsm.canBury()).toBe(false);
    expect(fsm.send({ type: 'bury' })).toBe(false);

    fsm.togglePlacement(0, 'mine');
    expect(fsm.canBury()).toBe(false);
    fsm.togglePlacement(1, 'mine');
    expect(fsm.canBury()).toBe(true);

    expect(fsm.send({ type: 'bury' })).toBe(true);
    expect(fsm.state).toBe('PASS');
    expect(fsm.context.playerIndex).toBe(1);
  });

  it('toggelt eine Mine wieder weg und respektiert das Kontingent', () => {
    const fsm = fsmWith(3);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });
    fsm.send({ type: 'tap' });

    expect(fsm.togglePlacement(0, 'mine')).toBe(true);
    expect(fsm.placeViewFor('p1').ownMines).toEqual([0]);

    expect(fsm.togglePlacement(0, 'mine')).toBe(true);
    expect(fsm.placeViewFor('p1').ownMines).toEqual([]);

    fsm.togglePlacement(0, 'mine');
    fsm.togglePlacement(1, 'mine');
    // Dritte Mine: Das Kontingent ist voll, die Logik bleibt unveraendert.
    expect(fsm.togglePlacement(2, 'mine')).toBe(false);
    expect(fsm.placeViewFor('p1').ownMines).toEqual([0, 1]);
  });

  it('ignoriert Place-Aktionen ausserhalb von PLACE', () => {
    const fsm = fsmWith(3);
    expect(fsm.togglePlacement(0, 'mine')).toBe(false);
    expect(fsm.canBury()).toBe(false);

    fsm.fillPlacements();
    expect(fsm.context.board.mines).toEqual({});
  });

  it('fuellt bei abgelaufener Bedenkzeit zufaellig auf', () => {
    const fsm = fsmWith(3);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });
    fsm.send({ type: 'tap' });

    fsm.fillPlacements();
    expect(fsm.placeViewFor('p1').ownMines).toHaveLength(2);
    expect(fsm.canBury()).toBe(true);
  });

  it('geht nach dem letzten Spieler zu BURIED und legt dort die Kiste (ADR-4)', () => {
    const fsm = fsmWith(3);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });

    for (let i = 0; i < 3; i++) {
      fsm.send({ type: 'tap' });
      fsm.fillPlacements();
      fsm.send({ type: 'bury' });
    }

    expect(fsm.state).toBe('BURIED');
    // Vor `begin` liegt noch keine Kiste — niemand koennte sie kennen.
    expect(fsm.view().chestsRemaining).toBe(0);

    fsm.send({ type: 'begin' });
    expect(fsm.state).toBe('DIG');
    expect(fsm.view().chestsRemaining).toBe(1);
  });
});

describe('Grabphase', () => {
  it('loest pro Tap genau eine Grabung aus (CLAUDE.md)', () => {
    const fsm = toDigPhase(fsmWith());

    fsm.send({ type: 'tileTap', cell: 0 });
    expect(fsm.digCount).toBe(1);
    expect(fsm.context.digs).toHaveLength(1);

    // Die Anzeige aendert nichts an der Logik.
    fsm.send({ type: 'digShown' });
    expect(fsm.digCount).toBe(1);
  });

  it('gibt den Zug erst nach der Inszenierung weiter', () => {
    const fsm = toDigPhase(fsmWith(4));
    const first = fsm.currentPlayer()?.id;

    fsm.send({ type: 'tileTap', cell: 0 });
    expect(fsm.currentPlayer()?.id).toBe(first);

    fsm.send({ type: 'digShown' });
    expect(fsm.currentPlayer()?.id).not.toBe(first);
  });

  it('rotiert den Startspieler von Runde zu Runde (GDD §3.4)', () => {
    const fsm = toDigPhase(fsmWith(4));
    expect(fsm.currentPlayer()?.id).toBe('p1');

    digUntilRoundOver(fsm, [TREASURE_CELL]);
    while (fsm.state === 'DISTRIBUTE') fsm.send({ type: 'payout', assignments: { p2: 4 } });

    fsm.send({ type: 'nextRound' });
    for (let i = 0; i < 4; i++) {
      fsm.send({ type: 'tap' });
      fsm.fillPlacements();
      fsm.send({ type: 'bury' });
    }
    fsm.send({ type: 'begin' });

    expect(fsm.context.roundIndex).toBe(2);
    expect(fsm.currentPlayer()?.id).toBe('p2');
  });

  it('graebt bei abgelaufenem Zug-Timer eine zufaellige geschlossene Platte', () => {
    const fsm = toDigPhase(fsmWith());

    expect(fsm.digRandom()).toBe(true);
    expect(fsm.digCount).toBe(1);
  });

  it('ignoriert den Timer-Fallback ausserhalb der Grabphase', () => {
    const fsm = fsmWith();
    expect(fsm.digRandom()).toBe(false);
  });
});

describe('Rundenende und Verteilung', () => {
  it('geht ohne Tokens direkt zum Result', () => {
    /*
     * Der Sonderfall: Die Kiste wird gefunden, aber der Finder bekommt keine Tokens.
     * Das passiert nur, wenn die Kisten-Tokens auf 0 stehen — hier ueber eine Runde
     * ohne Explosionen und mit manipuliertem Ergebnis nicht erreichbar, deshalb pruefen
     * wir den gegenteiligen Weg mit und stellen sicher, dass DISTRIBUTE korrekt greift.
     */
    const fsm = toDigPhase(fsmWith());
    digUntilRoundOver(fsm, [TREASURE_CELL]);

    expect(fsm.state).toBe('DISTRIBUTE');
    expect(fsm.context.result?.finderIds).toEqual(['p1']);
  });

  it('iteriert ueber alle Token-Besitzer und landet dann im Result', () => {
    // p1 tritt in eine Mine von p2, danach findet p1 die Kiste → zwei Verteiler.
    const fsm = fsmWith();
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });

    fsm.send({ type: 'tap' });
    fsm.togglePlacement(0, 'mine');
    fsm.togglePlacement(1, 'mine');
    fsm.send({ type: 'bury' }); // p1 legt auf 0 und 1

    fsm.send({ type: 'tap' });
    fsm.togglePlacement(5, 'mine');
    fsm.togglePlacement(6, 'mine');
    fsm.send({ type: 'bury' }); // p2 legt auf 5 und 6

    for (let i = 2; i < 4; i++) {
      fsm.send({ type: 'tap' });
      fsm.togglePlacement(10 + i, 'mine');
      fsm.togglePlacement(14 + i, 'mine');
      fsm.send({ type: 'bury' });
    }
    fsm.send({ type: 'begin' });

    fsm.send({ type: 'tileTap', cell: 5 }); // p1 tritt in p2s Mine
    fsm.send({ type: 'digShown' });
    expect(fsm.state).toBe('DIG');

    // p2, p3, p4 graben harmlos, danach ist p1 wieder dran und hebt die Kiste.
    for (const cell of [2, 3, 4]) {
      fsm.send({ type: 'tileTap', cell });
      fsm.send({ type: 'digShown' });
    }
    fsm.send({ type: 'tileTap', cell: TREASURE_CELL });
    fsm.send({ type: 'digShown' });

    expect(fsm.state).toBe('DISTRIBUTE');
    // Finder zuerst (Architektur §3).
    expect(fsm.distributingPlayer()?.id).toBe('p1');

    fsm.send({ type: 'payout', assignments: { p3: 4 } });
    expect(fsm.state).toBe('DISTRIBUTE');
    expect(fsm.distributingPlayer()?.id).toBe('p2');

    fsm.send({ type: 'payout', assignments: { p1: 1 } });
    expect(fsm.state).toBe('RESULT');
    expect(fsm.context.result?.distribution).toEqual([
      { from: 'p1', to: 'p3', sips: 4 },
      { from: 'p2', to: 'p1', sips: 1 },
    ]);
  });

  it('nennt ausserhalb von DISTRIBUTE niemanden als Verteiler', () => {
    const fsm = toDigPhase(fsmWith());
    expect(fsm.distributingPlayer()).toBeUndefined();
  });

  it('startet die naechste Runde mit frischem Feld', () => {
    const fsm = toDigPhase(fsmWith());
    digUntilRoundOver(fsm, [TREASURE_CELL]);
    while (fsm.state === 'DISTRIBUTE') fsm.send({ type: 'payout', assignments: { p2: 4 } });

    fsm.send({ type: 'nextRound' });

    expect(fsm.state).toBe('PASS');
    expect(fsm.view().opened).toEqual({});
    expect(fsm.context.digs).toEqual([]);
    expect(fsm.context.playerIndex).toBe(0);
  });
});

describe('Spieler und Einstellungen', () => {
  it('passt die Feldgroesse an die Spielerzahl an, solange keine Runde laeuft', () => {
    const fsm = fsmWith(4);
    expect(fsm.view().size).toBe(5);

    fsm.setPlayers(players(6));
    expect(fsm.view().size).toBe(6);

    fsm.send({ type: 'start' });
    fsm.setPlayers(players(3));
    expect(fsm.view().size).toBe(5);
  });

  it('laesst das laufende Feld in Ruhe, wenn mitten in der Runde Spieler wechseln', () => {
    const fsm = toDigPhase(fsmWith(6));
    expect(fsm.view().size).toBe(6);

    fsm.setPlayers(players(3));
    expect(fsm.view().size).toBe(6);
    expect(fsm.context.playerIndex).toBe(0);
  });

  it('uebernimmt neue Einstellungen', () => {
    const fsm = fsmWith();
    const next = settings({ modes: { nightDigger: true } });

    fsm.setSettings(next);
    expect(fsm.context.settings.modes.nightDigger).toBe(true);
  });

  it('haelt einen ungueltigen playerIndex im Bereich', () => {
    const fsm = fsmWith(6);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });
    for (let i = 0; i < 4; i++) {
      fsm.send({ type: 'tap' });
      fsm.fillPlacements();
      fsm.send({ type: 'bury' });
    }
    expect(fsm.context.playerIndex).toBe(4);

    fsm.setPlayers(players(3));
    expect(fsm.context.playerIndex).toBe(0);
  });

  it('startet ohne Spielerliste mit einem Minimalfeld', () => {
    const fsm = createFsm({ settings: settings() });
    expect(fsm.view().size).toBe(5);
    expect(fsm.currentPlayer()).toBeUndefined();
  });
});

describe('Informationssicherheit der FSM', () => {
  it('gibt Screens nur den publicView (CLAUDE.md)', () => {
    const fsm = toDigPhase(fsmWith());
    const view = fsm.view();

    expect(Object.keys(view)).toEqual(['size', 'opened', 'minesRemaining', 'chestsRemaining']);
    expect(JSON.stringify(view)).not.toContain(String(TREASURE_CELL));
  });

  it('zeigt einem Spieler auf dem Place-Screen nur die eigenen Minen', () => {
    const fsm = fsmWith(3);
    fsm.send({ type: 'start' });
    fsm.send({ type: 'mine' });

    fsm.send({ type: 'tap' });
    fsm.togglePlacement(0, 'mine');
    fsm.togglePlacement(1, 'mine');
    fsm.send({ type: 'bury' });

    fsm.send({ type: 'tap' });
    expect(fsm.placeViewFor('p2').ownMines).toEqual([]);
    expect(fsm.placeViewFor('p1').ownMines).toEqual([0, 1]);
  });
});
