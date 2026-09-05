/**
 * Der Sprite-Pool (Art Direction §8, Roadmap M4.4).
 *
 * Die Regel aus CLAUDE.md lautet "keine Allokationen im Loop", und das Partikel-Budget
 * nennt harte Obergrenzen. Beides ist hier nachrechenbar: Der Pool darf nie mehr Sprites
 * bauen als erlaubt, und er muss freigegebene wiederverwenden, statt neue zu erzeugen.
 *
 * PixiJS laeuft in jsdom ohne Renderer — `Sprite` und `Container` sind reine
 * Datenstrukturen, solange niemand zeichnet. Genau das reicht fuer diesen Test.
 */

import { Container, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PARTICLE_BUDGET } from '@/config/theme';
import { ParticlePool } from '@/game/fx/ParticlePool';

/** Ein Spritesheet-Doppel: mehr als eine Textur pro Name braucht der Pool nicht. */
function fakeSheet(frame: string): { textures: Record<string, Texture> } {
  return { textures: { [frame]: Texture.EMPTY } };
}

function makePool(max: number): ParticlePool {
  const frame = 'fx/smoke_s';
  return new ParticlePool({
    sheet: fakeSheet(frame) as never,
    frame,
    max,
    layer: new Container(),
  });
}

describe('ParticlePool', () => {
  it('wirft, wenn die Textur im Atlas fehlt', () => {
    expect(
      () =>
        new ParticlePool({
          sheet: fakeSheet('fx/smoke_s') as never,
          frame: 'fx/gibt_es_nicht',
          max: 4,
          layer: new Container(),
        })
    ).toThrow(/fehlt im Board-Atlas/);
  });

  it('baut nie mehr Sprites als das Budget erlaubt', () => {
    const pool = makePool(5);
    for (let i = 0; i < 50; i++) pool.acquire();
    expect(pool.size).toBe(5);
  });

  it('gibt ein freigegebenes Sprite wieder heraus, statt ein neues zu bauen', () => {
    const pool = makePool(10);
    const first = pool.acquire();
    pool.release(first);
    expect(pool.acquire()).toBe(first);
    expect(pool.size).toBe(1);
  });

  it('holt reihum das aelteste zurueck, wenn alles belegt ist', () => {
    /*
     * Der bewusste Kompromiss: Ist das Budget ausgeschoepft, wird ein noch laufendes
     * Sprite gekapert. Ein abgeschnittener Rauchfaden faellt niemandem auf, ein Ruckler
     * schon.
     */
    const pool = makePool(3);
    const taken = [pool.acquire(), pool.acquire(), pool.acquire()];
    const next = pool.acquire();
    expect(taken).toContain(next);
  });

  it('setzt ein wiederverwendetes Sprite auf Ausgangswerte zurueck', () => {
    const pool = makePool(2);
    const sprite = pool.acquire();
    sprite.alpha = 0.1;
    sprite.rotation = 2;
    sprite.scale.set(9);
    sprite.position.set(500, 500);
    sprite.tint = 0x00ff00;
    pool.release(sprite);

    const again = pool.acquire();
    expect(again).toBe(sprite);
    expect(again.alpha).toBe(1);
    expect(again.rotation).toBe(0);
    expect(again.scale.x).toBe(1);
    expect(again.x).toBe(0);
    expect(again.tint).toBe(0xffffff);
  });

  it('zaehlt, wieviele Sprites gerade laufen', () => {
    const pool = makePool(4);
    const a = pool.acquire();
    pool.acquire();
    expect(pool.active).toBe(2);
    pool.release(a);
    expect(pool.active).toBe(1);
    pool.releaseAll();
    expect(pool.active).toBe(0);
  });

  it('bleibt in der Summe unter der Obergrenze der Buehne (Art Direction §8)', () => {
    /*
     * Die Einzelbudgets sind so gewaehlt, dass sie zusammen unter der Gesamtgrenze
     * bleiben — sonst koennte ein Kistenfund waehrend einer Kettenreaktion die Buehne
     * ueberfuellen.
     */
    const total =
      PARTICLE_BUDGET.smoke.max +
      PARTICLE_BUDGET.dirt.max +
      PARTICLE_BUDGET.stars.max +
      PARTICLE_BUDGET.confetti.max +
      PARTICLE_BUDGET.leaves.max +
      PARTICLE_BUDGET.colorRing.max;
    expect(total).toBeLessThanOrEqual(PARTICLE_BUDGET.maxActiveSprites);
  });
});
