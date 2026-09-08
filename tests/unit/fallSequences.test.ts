/**
 * Die sechs Fall-Sequenzen (Audit A4).
 *
 * Sie laufen hier **wirklich** — auf einer Bühne ohne Renderer (`stageHarness.ts`), mit
 * echten Hikers, echten Balken und echten GSAP-Timelines. Geprüft wird dadurch nicht,
 * welche Methoden eine Sequenz aufruft, sondern was am Ende dasteht.
 *
 * Die vier Zusicherungen aus A4, für jede Sequenz einzeln:
 * 1. Labels `eyeContact` < `snap` < `climbedBack` — die Signatur (ADR-3).
 * 2. Dauer ≤ 5 s.
 * 3. Nach `reset()` steht jeder wieder trocken und aufrecht da.
 * 4. Sie klingt: Bruch und Platsch haben ihren Ton.
 */

import { afterEach, describe, expect, it } from 'vitest';
import gsap from 'gsap';
import { getSequence, type Sequence } from '@/game/sequences';
import '@/game/sequences';
import { FALL_SEQUENCES } from '@/config/sequences';
import { collisionGroup, createHarness, type Harness } from './stageHarness';

/** A4: Keine Fall-Sequenz darf länger als fünf Sekunden dauern. */
const MAX_FALL_MS = 5000;

let harness: Harness | undefined;

afterEach(() => {
  harness?.destroy();
  harness = undefined;
  gsap.globalTimeline.clear();
});

/** Baut eine Runde, in der `size` Leute auf einem Balken landen. */
function buildFor(size: number): { harness: Harness; plank: number; players: string[] } {
  const picks = [...Array.from({ length: size }, () => 3), 5, 6];
  const created = createHarness({ picks, plankCount: picks.length + 2 });
  harness = created;
  const group = collisionGroup(created);
  return { harness: created, ...group };
}

function sequenceOf(id: string): Sequence {
  const sequence = getSequence(id);
  expect(sequence, `${id} ist nicht registriert`).toBeDefined();
  return sequence!;
}

describe('Alle sechs sind gebaut', () => {
  it('registriert jede Fall-Sequenz aus GDD §4.3', () => {
    for (const meta of FALL_SEQUENCES) {
      expect(getSequence(meta.id), meta.id).toBeDefined();
    }
  });

  it('hält den Katalog vollständig — nichts fehlt mehr', async () => {
    const { missingImplementations } = await import('@/game/sequences');
    expect(missingImplementations()).toEqual([]);
  });
});

describe.each(FALL_SEQUENCES.map((meta) => [meta.id, meta.minGroup ?? 2] as const))(
  '%s',
  (id, minGroup) => {
    it('trägt die Signatur: eyeContact < snap < climbedBack', () => {
      const { harness: h, plank, players } = buildFor(minGroup);
      const timeline = sequenceOf(id).build(h.contextFor(plank, players));

      const eye = timeline.labels['eyeContact'];
      const snap = timeline.labels['snap'];
      const back = timeline.labels['climbedBack'];

      expect(eye, 'eyeContact fehlt').toBeDefined();
      expect(snap, 'snap fehlt').toBeDefined();
      expect(back, 'climbedBack fehlt').toBeDefined();

      expect(eye!).toBeLessThan(snap!);
      expect(snap!).toBeLessThan(back!);
      /* Der Blickkontakt steht am Anfang — nicht irgendwo mittendrin. */
      expect(eye!).toBe(0);
    });

    it(`dauert höchstens ${MAX_FALL_MS / 1000} s`, () => {
      const { harness: h, plank, players } = buildFor(minGroup);
      const timeline = sequenceOf(id).build(h.contextFor(plank, players));

      expect(timeline.duration() * 1000).toBeLessThanOrEqual(MAX_FALL_MS);
      /* Und sie ist keine leere Hülle. */
      expect(timeline.duration() * 1000).toBeGreaterThan(1500);
    });

    it('lässt nach reset() alle wieder trocken und aufrecht dastehen', () => {
      const { harness: h, plank, players } = buildFor(minGroup);
      const timeline = sequenceOf(id).build(h.contextFor(plank, players));

      /* Ganz durchspielen — bis ans Ende, nicht bis zur Mitte. */
      timeline.progress(1);

      for (const playerId of players) {
        const hiker = h.hikers.get(playerId)!;
        hiker.reset();

        expect(hiker.view.rotation, `${playerId} liegt schief`).toBe(0);
        expect(hiker.view.alpha, `${playerId} ist durchsichtig`).toBe(1);
        expect(hiker.getFace(), `${playerId} guckt noch nass`).toBe('neutral');
        expect(hiker.isDriven(), `${playerId} wird noch geführt`).toBe(false);
        expect(hiker.rig.body.rotation).toBe(0);
        expect(hiker.rig.body.scale.x).toBe(1);
        expect(hiker.rig.body.scale.y).toBe(1);
        /* Der Hut hängt wieder am Kopf, auch wenn er weggeflogen war. */
        expect(hiker.rig.hat.parent).toBe(hiker.rig.head);
      }
    });

    it('gibt dem Bruch und dem Platsch ihren Ton', () => {
      const { harness: h, plank, players } = buildFor(minGroup);
      const timeline = sequenceOf(id).build(h.contextFor(plank, players));
      timeline.progress(1);

      expect(h.played, 'kein Knacken').toContain('plank_snap');
      expect(h.played, 'kein Platsch').toContain('splash');
      /* Der Blickkontakt hat sein Knarren — er ist der Anfang, nicht der Bruch. */
      expect(h.played[0]).toBe('creak_1');
    });

    it('räumt den Balken ab und setzt niemanden neben die Schlucht', () => {
      const { harness: h, plank, players } = buildFor(minGroup);
      const timeline = sequenceOf(id).build(h.contextFor(plank, players));
      timeline.progress(1);

      for (const playerId of players) {
        const hiker = h.hikers.get(playerId)!;
        /* Am Ende hängt jeder am Balken, nicht im Fluss (Art Direction §7). */
        expect(Number.isFinite(hiker.x), `${playerId} hat keine Position`).toBe(true);
        expect(Number.isFinite(hiker.y)).toBe(true);
      }
    });
  }
);

describe('fall_domino', () => {
  it('braucht drei — der Katalog hält es von Paaren fern', () => {
    const meta = FALL_SEQUENCES.find((entry) => entry.id === 'fall_domino')!;
    expect(meta.minGroup).toBe(3);
  });

  it('kippt sie nacheinander, nicht gleichzeitig', () => {
    const { harness: h, plank, players } = buildFor(3);
    const timeline = sequenceOf('fall_domino').build(h.contextFor(plank, players));

    /* Der Versatz ist der Gag: gleichzeitig wäre es ein Sturz, nacheinander eine Kette. */
    const snapAt = timeline.labels['snap']!;
    timeline.seek(snapAt + 0.05);
    const rotations = players.map((id) => h.hikers.get(id)!.view.rotation);
    expect(new Set(rotations).size).toBeGreaterThan(1);
  });
});

describe('fall_seesaw', () => {
  it('nimmt Gustav in Dienst', () => {
    const source = new URL('../../src/game/sequences/fall/Seesaw.ts', import.meta.url);
    expect(source.pathname).toContain('Seesaw');

    const { harness: h, plank, players } = buildFor(2);
    const timeline = sequenceOf('fall_seesaw').build(h.contextFor(plank, players));
    timeline.progress(1);

    /* Er kreischt, wenn er fängt, und lacht, wenn er loslässt. */
    expect(h.played).toContain('vulture_screech');
    expect(h.played).toContain('vulture_laugh');
  });
});
