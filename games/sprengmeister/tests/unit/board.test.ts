/**
 * Board-Matrix (Roadmap M0.5, Audit A0).
 *
 * Deckt alle `kind`-Faelle ab: leer, eigene Mine stumm, Krater einfach und gestapelt,
 * Blindgaenger, Kiste, Preis der Gier (auch mit Stapel), Kettenreaktion, Zwei Kisten,
 * Nachtgraeber-Hints.
 */

import { describe, expect, it } from 'vitest';
import {
  chebyshev,
  cellToXY,
  closedCells,
  createBoard,
  critterFor,
  dig,
  fillRandomMines,
  hasPlacement,
  hintFor,
  isOnBoard,
  isOpen,
  minesComplete,
  neighbours,
  placeMine,
  placeTreasure,
  placementsOf,
  removeMine,
  xyToCell,
} from '@/core/board';
import { buildBoard, fixedRandom, modes } from './helpers';

const seed = 12345;

/** Kurzform: graben mit Standard-Modi. */
function digAt(board = createBoard(4), cell = 0, by = 'p1', m = modes()) {
  return dig(board, cell, by, { modes: m, seed });
}

describe('Geometrie', () => {
  it('rechnet Zelle ↔ Koordinate hin und zurueck', () => {
    expect(cellToXY(0, 5)).toEqual({ x: 0, y: 0 });
    expect(cellToXY(7, 5)).toEqual({ x: 2, y: 1 });
    expect(cellToXY(24, 5)).toEqual({ x: 4, y: 4 });
    expect(xyToCell(2, 1, 5)).toBe(7);
  });

  it('kennt die Feldgrenzen', () => {
    expect(isOnBoard(0, 5)).toBe(true);
    expect(isOnBoard(24, 5)).toBe(true);
    expect(isOnBoard(25, 5)).toBe(false);
    expect(isOnBoard(-1, 5)).toBe(false);
    expect(isOnBoard(1.5, 5)).toBe(false);
    expect(isOnBoard(35, 6)).toBe(true);
  });

  it('misst Chebyshev-Abstaende (Koenigszuege)', () => {
    // (0,0) → (1,1) ist diagonal ein Zug, nicht zwei.
    expect(chebyshev(0, 6, 5)).toBe(1);
    expect(chebyshev(0, 24, 5)).toBe(4);
    expect(chebyshev(12, 12, 5)).toBe(0);
  });

  it('liefert 8 Nachbarn in der Mitte, 3 in der Ecke, 5 am Rand', () => {
    expect(neighbours(12, 5)).toHaveLength(8);
    expect(neighbours(0, 5).sort((a, b) => a - b)).toEqual([1, 5, 6]);
    expect(neighbours(24, 5)).toHaveLength(3);
    expect(neighbours(2, 5)).toHaveLength(5);
  });
});

describe('Feldgroesse', () => {
  it('waehlt 5 × 5 bis 5 Spieler und 6 × 6 ab 6 (GDD §3.2)', () => {
    expect(createBoard(3).size).toBe(5);
    expect(createBoard(5).size).toBe(5);
    expect(createBoard(6).size).toBe(6);
    expect(createBoard(8).size).toBe(6);
  });
});

describe('Minen legen (GDD §3.3)', () => {
  it('vergraebt zwei Minen und nimmt sie per Toggle wieder weg', () => {
    let board = createBoard(4);
    board = placeMine(board, 3, 'p1', 'mine', modes());
    board = placeMine(board, 9, 'p1', 'mine', modes());

    expect(placementsOf(board, 'p1').mines).toEqual([3, 9]);
    expect(hasPlacement(board, 3, 'p1')).toBe('mine');

    board = removeMine(board, 3, 'p1');
    expect(placementsOf(board, 'p1').mines).toEqual([9]);
    expect(hasPlacement(board, 3, 'p1')).toBeNull();
  });

  it('laesst mehrere Spieler dieselbe Zelle waehlen — Minen stapeln', () => {
    let board = createBoard(4);
    board = placeMine(board, 7, 'p1', 'mine', modes());
    board = placeMine(board, 7, 'p2', 'mine', modes());
    expect(board.mines[7]?.owners).toEqual(['p1', 'p2']);
  });

  it('verbietet demselben Spieler dieselbe Zelle zweimal', () => {
    const board = placeMine(createBoard(4), 7, 'p1', 'mine', modes());
    expect(() => placeMine(board, 7, 'p1', 'mine', modes())).toThrow(/schon etwas liegen/);
  });

  it('erzwingt das Kontingent', () => {
    let board = createBoard(4);
    board = placeMine(board, 0, 'p1', 'mine', modes());
    board = placeMine(board, 1, 'p1', 'mine', modes());
    expect(() => placeMine(board, 2, 'p1', 'mine', modes())).toThrow(/Kontingent/);
  });

  it('gibt im Doppelagent-Modus eine Mine und einen Blindgaenger', () => {
    const m = modes({ doubleAgent: true });
    let board = placeMine(createBoard(4), 0, 'p1', 'mine', m);
    board = placeMine(board, 1, 'p1', 'dud', m);

    expect(placementsOf(board, 'p1')).toEqual({ mines: [0], duds: [1] });
    expect(() => placeMine(board, 2, 'p1', 'mine', m)).toThrow(/Kontingent/);
    expect(() => placeMine(board, 2, 'p1', 'dud', m)).toThrow(/Kontingent/);
    // Ohne Doppelagent gibt es gar keine Blindgaenger.
    expect(() => placeMine(createBoard(4), 0, 'p1', 'dud', modes())).toThrow(/Kontingent/);
  });

  it('weist Zellen ausserhalb des Feldes ab', () => {
    expect(() => placeMine(createBoard(4), 25, 'p1', 'mine', modes())).toThrow(RangeError);
  });

  it('ignoriert removeMine auf einer leeren Zelle', () => {
    const board = createBoard(4);
    expect(removeMine(board, 5, 'p1')).toBe(board);
  });

  it('raeumt den Stapel weg, wenn der letzte Leger abzieht', () => {
    let board = placeMine(createBoard(4), 5, 'p1', 'mine', modes());
    board = placeMine(board, 5, 'p2', 'mine', modes());
    board = removeMine(board, 5, 'p1');
    expect(board.mines[5]?.owners).toEqual(['p2']);
    board = removeMine(board, 5, 'p2');
    expect(board.mines[5]).toBeUndefined();
  });

  it('erkennt ein vollstaendig vermintes Feld', () => {
    let board = createBoard(3);
    expect(minesComplete(board, ['p1'], modes())).toBe(false);
    board = placeMine(board, 0, 'p1', 'mine', modes());
    board = placeMine(board, 1, 'p1', 'mine', modes());
    expect(minesComplete(board, ['p1'], modes())).toBe(true);
    expect(minesComplete(board, ['p1', 'p2'], modes())).toBe(false);
  });

  it('fuellt fehlende Minen zufaellig auf (Bedenkzeit-Fallback)', () => {
    const board = fillRandomMines(createBoard(4), 'p1', modes(), fixedRandom(0, 3));
    expect(placementsOf(board, 'p1').mines).toHaveLength(2);
  });

  it('fuellt im Doppelagent-Modus Mine und Blindgaenger auf', () => {
    const m = modes({ doubleAgent: true });
    const board = fillRandomMines(createBoard(4), 'p1', m, fixedRandom(0, 5));
    const placed = placementsOf(board, 'p1');
    expect(placed.mines).toHaveLength(1);
    expect(placed.duds).toHaveLength(1);
  });

  it('laesst bereits vollstaendige Kontingente in Ruhe', () => {
    let board = placeMine(createBoard(4), 0, 'p1', 'mine', modes());
    board = placeMine(board, 1, 'p1', 'mine', modes());
    expect(fillRandomMines(board, 'p1', modes(), fixedRandom(2))).toBe(board);
  });
});

describe('Kiste legen (ADR-4)', () => {
  it('legt genau eine Kiste', () => {
    const board = placeTreasure(createBoard(4), modes(), fixedRandom(17));
    expect(board.treasure).toEqual([17]);
  });

  it('legt bei "Zwei Kisten" zwei verschiedene Zellen', () => {
    // Der Fake liefert erst zweimal dieselbe Zelle — die zweite wird verworfen.
    const board = placeTreasure(createBoard(4), modes({ twoChests: true }), fixedRandom(4, 4, 9));
    expect(board.treasure).toEqual([4, 9]);
  });

  it('darf die Kiste auf ein vermintes Feld legen (ADR-4)', () => {
    const mined = buildBoard({ playerCount: 4, mines: { 11: ['p2'] } });
    const board = placeTreasure(mined, modes(), fixedRandom(11));
    expect(board.treasure).toEqual([11]);
    expect(board.mines[11]?.owners).toEqual(['p2']);
  });
});

describe('Temperatur-Hinweise (ADR-3)', () => {
  // Kiste in der Ecke (0,0). In der Feldmitte gaebe es auf 5 × 5 gar kein "kalt":
  // von dort ist keine Zelle weiter als zwei Koenigszuege entfernt.
  const board = buildBoard({ playerCount: 4, treasure: [0] });

  it('unterscheidet heiss, warm und kalt nach Chebyshev-Abstand', () => {
    expect(hintFor(board, 6, modes())).toBe('hot'); // (1,1) → Abstand 1
    expect(hintFor(board, 12, modes())).toBe('warm'); // (2,2) → Abstand 2
    expect(hintFor(board, 18, modes())).toBe('cold'); // (3,3) → Abstand 3
    expect(hintFor(board, 24, modes())).toBe('cold'); // (4,4) → Abstand 4
  });

  it('schweigt im Nachtgraeber-Modus', () => {
    expect(hintFor(board, 6, modes({ nightDigger: true }))).toBe('none');
  });

  it('schweigt, solange keine Kiste liegt', () => {
    expect(hintFor(createBoard(4), 6, modes())).toBe('none');
  });

  it('nimmt bei zwei Kisten die naehere', () => {
    const two = buildBoard({ playerCount: 4, treasure: [0, 24] });
    expect(hintFor(two, 6, modes())).toBe('hot'); // (1,1), direkt an der ersten Kiste
    expect(hintFor(two, 18, modes())).toBe('hot'); // (3,3), direkt an der zweiten
    expect(hintFor(two, 4, modes())).toBe('cold'); // (4,0), von beiden vier Zuege weg
  });
});

describe('Fundstuecke', () => {
  it('haengen nur an Seed und Zelle, nie am Inhalt (ADR-2)', () => {
    expect(critterFor(seed, 7)).toBe(critterFor(seed, 7));
    // Ein anderer Seed darf ein anderes Tier liefern — dieselbe Zelle bleibt stabil.
    const perCell = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((cell) => critterFor(seed, cell)));
    expect(perCell.size).toBeGreaterThan(1);
  });
});

describe('dig() — die Ergebnismatrix (GDD §3.4)', () => {
  it('leeres Feld: Hinweis und Fundstueck, niemand ist schuld', () => {
    const board = buildBoard({ playerCount: 4, treasure: [12] });
    const { result } = digAt(board, 6);

    expect(result.kind).toBe('empty');
    expect(result.hint).toBe('hot');
    expect(result.foreignMines).toEqual([]);
    expect(result.ownMineConsumed).toBe(false);
    expect(result.roundOver).toBe(false);
  });

  it('eigene Mine: stumm, wie ein leeres Feld (ADR-2)', () => {
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p1'] }, treasure: [12] });
    const { result } = digAt(board, 6, 'p1');

    expect(result.kind).toBe('empty');
    expect(result.foreignMines).toEqual([]);
    expect(result.hint).toBe('hot');
    // Nur intern, fuer den "Feigling" des Sprengmeister-Bonus:
    expect(result.ownMineConsumed).toBe(true);
  });

  it('fremde Mine: Krater, Leger sichtbar', () => {
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p2'] }, treasure: [12] });
    const { board: next, result } = digAt(board, 6, 'p1');

    expect(result.kind).toBe('crater');
    expect(result.foreignMines).toEqual(['p2']);
    expect(next.opened[6]?.blamed).toEqual(['p2']);
    expect(result.hint).toBe('hot');
  });

  it('Stapel: beide Leger erscheinen', () => {
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p2', 'p3'] }, treasure: [12] });
    const { result } = digAt(board, 6, 'p1');

    expect(result.kind).toBe('crater');
    expect(result.foreignMines).toEqual(['p2', 'p3']);
  });

  it('eigene Mine im Stapel mit einer fremden: es knallt, aber nur der Fremde wird gezeigt', () => {
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p1', 'p2'] }, treasure: [12] });
    const { result } = digAt(board, 6, 'p1');

    expect(result.kind).toBe('crater');
    expect(result.foreignMines).toEqual(['p2']);
    expect(result.ownMineConsumed).toBe(true);
  });

  it('Blindgaenger: "Pfff", Leger sichtbar, niemand trinkt', () => {
    const board = buildBoard({
      playerCount: 4,
      duds: { 6: ['p2'] },
      treasure: [12],
      modes: modes({ doubleAgent: true }),
    });
    const { board: next, result } = digAt(board, 6, 'p1', modes({ doubleAgent: true }));

    expect(result.kind).toBe('dud');
    expect(result.dudOwners).toEqual(['p2']);
    expect(next.opened[6]?.blamed).toEqual(['p2']);
  });

  it('eigener Blindgaenger ist ebenfalls stumm', () => {
    const m = modes({ doubleAgent: true });
    const board = buildBoard({ playerCount: 4, duds: { 6: ['p1'] }, treasure: [12], modes: m });
    const { result } = digAt(board, 6, 'p1', m);

    expect(result.kind).toBe('empty');
    expect(result.dudOwners).toEqual([]);
    expect(result.ownDudConsumed).toBe(true);
  });

  it('eigener Trittstein unter einem fremden Blindgaenger: es bleibt beim "Pfff"', () => {
    /*
     * Der eigene Trittstein macht die Zelle nicht stumm — er macht nur *sich selbst*
     * unsichtbar. Was sonst noch drinliegt, wird gezeigt wie immer (ADR-2).
     */
    const m = modes({ doubleAgent: true });
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p1'] }, duds: { 6: ['p2'] }, modes: m });
    const { board: next, result } = digAt(board, 6, 'p1', m);

    expect(result.kind).toBe('dud');
    expect(result.dudOwners).toEqual(['p2']);
    expect(result.ownMineConsumed).toBe(true);
    // Ununterscheidbar von einem Blindgaenger ohne eigene Mine darunter:
    const plain = buildBoard({ playerCount: 4, duds: { 6: ['p2'] }, modes: m });
    expect(next.opened[6]).toEqual(digAt(plain, 6, 'p1', m).board.opened[6]);
  });

  it('fremde Mine schlaegt fremden Blindgaenger', () => {
    const m = modes({ doubleAgent: true });
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p2'] }, duds: { 6: ['p3'] }, modes: m });
    const { board: next, result } = digAt(board, 6, 'p1', m);

    expect(result.kind).toBe('crater');
    // Der Blindgaenger geht im Krater unter — gezeigt wird, wer wirklich geschossen hat.
    expect(next.opened[6]?.blamed).toEqual(['p2']);
  });

  it('Kiste: Fanfare, Runde vorbei, kein Temperatur-Icon auf der Kistenplatte', () => {
    const board = buildBoard({ playerCount: 4, treasure: [12] });
    const { result } = digAt(board, 12, 'p1');

    expect(result.kind).toBe('treasure');
    expect(result.treasureFound).toBe(true);
    expect(result.roundOver).toBe(true);
    expect(result.hint).toBe('none');
  });

  it('Preis der Gier: Kiste auf verminter Zelle (ADR-4)', () => {
    const board = buildBoard({ playerCount: 4, mines: { 12: ['p2'] }, treasure: [12] });
    const { result } = digAt(board, 12, 'p1');

    expect(result.kind).toBe('greed');
    expect(result.foreignMines).toEqual(['p2']);
    expect(result.treasureFound).toBe(true);
    expect(result.roundOver).toBe(true);
  });

  it('Preis der Gier mit Stapel', () => {
    const board = buildBoard({ playerCount: 4, mines: { 12: ['p2', 'p3'] }, treasure: [12] });
    const { result } = digAt(board, 12, 'p1');

    expect(result.kind).toBe('greed');
    expect(result.foreignMines).toEqual(['p2', 'p3']);
  });

  it('Kiste auf der eigenen Mine bleibt eine schlichte Kiste', () => {
    const board = buildBoard({ playerCount: 4, mines: { 12: ['p1'] }, treasure: [12] });
    const { result } = digAt(board, 12, 'p1');

    expect(result.kind).toBe('treasure');
    expect(result.ownMineConsumed).toBe(true);
  });

  it('beendet die Runde bei zwei Kisten erst nach dem zweiten Fund', () => {
    const m = modes({ twoChests: true });
    const board = buildBoard({ playerCount: 4, treasure: [3, 20], modes: m });

    const first = dig(board, 3, 'p1', { modes: m, seed });
    expect(first.result.roundOver).toBe(false);

    const second = dig(first.board, 20, 'p2', { modes: m, seed });
    expect(second.result.roundOver).toBe(true);
  });

  it('weist eine schon offene Zelle und Zellen ausserhalb des Feldes ab', () => {
    const board = buildBoard({ playerCount: 4, treasure: [12] });
    const { board: next } = digAt(board, 6);

    expect(() => digAt(next, 6)).toThrow(/schon aufgegraben/);
    expect(() => digAt(board, 99)).toThrow(RangeError);
  });

  it('merkt sich, wer gegraben hat, und schliesst die Zelle', () => {
    const board = buildBoard({ playerCount: 4, treasure: [12] });
    const { board: next } = digAt(board, 6, 'p3');

    expect(next.opened[6]?.by).toBe('p3');
    expect(isOpen(next, 6)).toBe(true);
    expect(closedCells(next)).toHaveLength(24);
  });
});

describe('Kettenreaktion (GDD §3.6, ADR-7)', () => {
  const chain = modes({ chainReaction: true });

  it('reisst die Minen der 8 Nachbarn mit auf und zeigt ihre Leger', () => {
    const board = buildBoard({
      playerCount: 4,
      // 6 ist der Tap, 0/2/12 sind Nachbarn, 24 liegt weit weg.
      mines: { 6: ['p2'], 0: ['p3'], 2: ['p4'], 12: ['p2'], 24: ['p3'] },
      treasure: [18],
      modes: chain,
    });
    const { board: next, result } = digAt(board, 6, 'p1', chain);

    expect(result.kind).toBe('crater');
    expect(result.chainReveals.map((r) => r.cell).sort((a, b) => a - b)).toEqual([0, 2, 12]);
    expect(next.opened[0]?.blamed).toEqual(['p3']);
    expect(next.opened[0]?.byChain).toBe(true);
    // Die entfernte Mine bleibt liegen — keine Kaskade.
    expect(next.opened[24]).toBeUndefined();
  });

  it('laesst eine Nachbarzelle mit Kiste zu (ADR-7)', () => {
    const board = buildBoard({
      playerCount: 4,
      mines: { 6: ['p2'], 12: ['p3'] },
      treasure: [12],
      modes: chain,
    });
    const { board: next, result } = digAt(board, 6, 'p1', chain);

    expect(result.chainReveals).toEqual([]);
    expect(next.opened[12]).toBeUndefined();
    expect(result.roundOver).toBe(false);
  });

  it('ueberspringt bereits offene Nachbarn', () => {
    const board = buildBoard({
      playerCount: 4,
      mines: { 6: ['p2'], 12: ['p3'] },
      treasure: [24],
      modes: chain,
    });
    const opened = dig(board, 12, 'p3', { modes: chain, seed }).board; // p3 tritt auf seinen Trittstein
    const { result } = dig(opened, 6, 'p1', { modes: chain, seed });

    expect(result.chainReveals).toEqual([]);
  });

  it('zeigt bei "Preis der Gier" ebenfalls die Nachbarn', () => {
    const board = buildBoard({
      playerCount: 4,
      mines: { 12: ['p2'], 6: ['p3'] },
      treasure: [12],
      modes: chain,
    });
    const { result } = digAt(board, 12, 'p1', chain);

    expect(result.kind).toBe('greed');
    expect(result.chainReveals.map((r) => r.cell)).toContain(6);
  });

  it('loest bei einem leeren Feld und bei einem Blindgaenger nichts aus', () => {
    const m = modes({ chainReaction: true, doubleAgent: true });
    const board = buildBoard({
      playerCount: 4,
      mines: { 12: ['p3'] },
      duds: { 6: ['p2'] },
      treasure: [24],
      modes: m,
    });

    expect(digAt(board, 6, 'p1', m).result.chainReveals).toEqual([]);
    expect(digAt(board, 7, 'p1', m).result.chainReveals).toEqual([]);
  });

  it('bleibt aus, wenn der Modus nicht aktiv ist', () => {
    const board = buildBoard({ playerCount: 4, mines: { 6: ['p2'], 12: ['p3'] }, treasure: [24] });
    expect(digAt(board, 6, 'p1').result.chainReveals).toEqual([]);
  });

  it('zeigt auch eine eigene Mine des Graebers — Absicht des Modus (ADR-7)', () => {
    const board = buildBoard({
      playerCount: 4,
      mines: { 6: ['p2'], 12: ['p1'] },
      treasure: [24],
      modes: chain,
    });
    const { board: next } = digAt(board, 6, 'p1', chain);
    expect(next.opened[12]?.blamed).toEqual(['p1']);
  });

  it('vergibt Hinweise auch an die aufgerissenen Nachbarn', () => {
    const board = buildBoard({
      playerCount: 4,
      mines: { 6: ['p2'], 12: ['p3'] },
      treasure: [18],
      modes: chain,
    });
    const { result } = digAt(board, 6, 'p1', chain);
    expect(result.chainReveals[0]?.hint).toBe('hot'); // 12 → 18 ist Abstand 1
  });
});
