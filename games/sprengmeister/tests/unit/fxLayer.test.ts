/**
 * Die Effekt-Ebene (Playtest-Finding 01, ADR-23/ADR-25).
 *
 * Zwei Regeln, und die erste hat im Spiel jeden Knall gekostet:
 *
 * 1. **Beim Bauen ist nichts zu sehen.** Eine Sequenz wird erzeugt, während die
 *    Anticipation läuft, und erst knapp eine Sekunde später abgespielt. Wer die Sprites
 *    beim Anfordern sichtbar macht, legt neun Rauchwolken bewegungslos auf eine
 *    geschlossene Platte: Die Mine ist verraten, und beim Aufdecken *erscheint* nichts
 *    mehr — es fängt nur an, sich zu bewegen.
 * 2. **Größen stehen in Welteinheiten**, nicht in Atlas-Pixeln. `FxLayer` war die einzige
 *    Ebene, die den rohen Pixelmaßstab benutzt hat; auf einem 390er-Handy kamen dabei
 *    Erdklumpen von vier Pixeln heraus.
 *
 * PixiJS läuft in jsdom ohne Renderer — `Sprite` und `Container` sind reine
 * Datenstrukturen, solange niemand zeichnet. Für beide Fragen reicht das.
 */

import { Texture, type Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { FX_SIZE, PARTICLE_BUDGET } from '@/config/theme';
import { createSeededRng } from '@/core/rng';
import { FxLayer } from '@/game/fx/FxLayer';

/** Die Frames, die `FxLayer` anfordert — alle mit derselben Ersatz-Textur. */
const FRAMES = ['fx/smoke_s', 'fx/smoke_m', 'fx/smoke_l', 'fx/dirt', 'fx/star', 'fx/leaf', 'fx/confetti'];

/**
 * Ein Spritesheet-Doppel mit **bekannter** Texturbreite.
 *
 * 64 px sind die echte Breite von `fx/smoke_s` im Atlas — damit lässt sich nachrechnen,
 * ob die Ebene in Welteinheiten skaliert: `scale.x * 64` muss die gewünschte Größe ergeben.
 */
const TEXTURE_WIDTH = 64;

function fakeSheet(): { textures: Record<string, Texture> } {
  const texture = new Texture({
    source: Texture.EMPTY.source,
    frame: { x: 0, y: 0, width: TEXTURE_WIDTH, height: TEXTURE_WIDTH } as never,
  });
  return { textures: Object.fromEntries(FRAMES.map((frame) => [frame, texture])) };
}

function makeLayer(lowEffects = false): FxLayer {
  return new FxLayer({ sheet: fakeSheet() as never, rng: createSeededRng(7), lowEffects });
}

/** Alle Sprites der Ebene, unabhängig davon, aus welchem Pool sie kommen. */
function sprites(layer: FxLayer): Container[] {
  return [...layer.view.children] as Container[];
}

function visibleCount(layer: FxLayer): number {
  return sprites(layer).filter((sprite) => sprite.visible).length;
}

/** Spielt eine Timeline synchron ab — `time(…, false)` feuert die Callbacks mit. */
function runToEnd(timeline: gsap.core.Timeline): void {
  timeline.pause(0);
  timeline.time(timeline.duration(), false);
}

describe('FxLayer: beim Bauen ist nichts zu sehen', () => {
  it('macht kein Sprite sichtbar, solange die Timeline nicht laeuft', () => {
    const layer = makeLayer();

    // Alle fuenf Rezepte auf einmal — keines darf vorgreifen.
    layer.smoke(500, 700);
    layer.dirt(500, 700);
    layer.stars(500, 700);
    layer.leaves(500, 700);
    layer.confetti(500, 700);

    expect(visibleCount(layer)).toBe(0);
    // Reserviert sind sie trotzdem: Der Pool darf sie nicht ein zweites Mal hergeben.
    expect(layer.active).toBeGreaterThan(0);
  });

  it('macht sie sichtbar, sobald die Bewegung anfaengt', () => {
    const layer = makeLayer();
    const timeline = layer.smoke(500, 700);

    expect(visibleCount(layer)).toBe(0);
    timeline.pause(0);
    // Ein Stueck weit vorspulen: die ersten Wolken sind los, die letzten noch nicht.
    timeline.time(0.2, false);
    expect(visibleCount(layer)).toBeGreaterThan(0);
  });

  it('gibt am Ende alles wieder frei', () => {
    const layer = makeLayer();
    runToEnd(layer.dirt(500, 700, 8));

    expect(layer.active).toBe(0);
    expect(visibleCount(layer)).toBe(0);
  });

  it('sammelt eine abgebrochene Inszenierung ein', () => {
    /*
     * Der Fall, den `DigDirector.stop()` abdeckt: Wird die Timeline gekillt, kommt kein
     * `onComplete` mehr — ohne `clear()` blieben die Sprites fuer immer belegt.
     */
    const layer = makeLayer();
    const timeline = layer.smoke(500, 700);
    timeline.pause(0);
    timeline.time(0.3, false);
    expect(layer.active).toBeGreaterThan(0);

    timeline.kill();
    layer.clear();
    expect(layer.active).toBe(0);
    expect(visibleCount(layer)).toBe(0);
  });
});

describe('FxLayer: Groessen in Welteinheiten', () => {
  it('skaliert Erdklumpen auf die Zielgroesse statt auf Atlas-Pixel', () => {
    const layer = makeLayer();
    const timeline = layer.dirt(500, 700, 6);
    timeline.pause(0);
    timeline.time(0.1, false);

    const widths = sprites(layer)
      .filter((sprite) => sprite.visible)
      .map((sprite) => sprite.scale.x * TEXTURE_WIDTH);

    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) {
      // Der Jitter liegt bei 0,7 bis 1,25 — mehr darf es nicht auseinanderlaufen.
      expect(width).toBeGreaterThanOrEqual(FX_SIZE.dirt * 0.65);
      expect(width).toBeLessThanOrEqual(FX_SIZE.dirt * 1.3);
    }
  });

  it('laesst den Rauchpilz auf Plattengroesse anwachsen', () => {
    const layer = makeLayer();
    runToEnd(layer.smoke(500, 700));

    /*
     * Am Ende der Bewegung steht die Zielgroesse. Der Kopf muss ungefaehr eine Platte
     * breit sein (185 bzw. 153 Welteinheiten) — vorher war der ganze Pilz so gross.
     */
    const widest = Math.max(...sprites(layer).map((sprite) => sprite.scale.x * TEXTURE_WIDTH));
    expect(widest).toBeGreaterThanOrEqual(FX_SIZE.smokeHead * 0.75);
  });

  it('nutzt alle drei Rauchgroessen (GDD §8)', () => {
    /*
     * `fx/smoke_l` lag bis zum ersten Playtest ungenutzt im Atlas. Gezaehlt werden die
     * angelegten Sprites je Pool — das Budget teilt sie 6 · 4 · 2 auf.
     */
    const layer = makeLayer();
    layer.smoke(500, 700);

    const perSize = new Map<number, number>();
    for (const sprite of sprites(layer)) {
      const key = Math.round(sprite.scale.x * 1000);
      perSize.set(key, (perSize.get(key) ?? 0) + 1);
    }
    // Drei verschiedene Zielgroessen im Pilz — Stiel, Uebergang, Kopf.
    expect(perSize.size).toBeGreaterThanOrEqual(3);
  });

  it('bleibt in der Summe unter dem Budget aus Art Direction §8', () => {
    const layer = makeLayer();
    for (let i = 0; i < 5; i++) {
      layer.smoke(500, 700);
      layer.dirt(500, 700, 20);
    }
    expect(layer.active).toBeLessThanOrEqual(PARTICLE_BUDGET.smoke.max + PARTICLE_BUDGET.dirt.max);
  });

  it('kuerzt die Zahl bei Low-Effects, statt den Effekt zu streichen', () => {
    /*
     * Ein Krater ohne jeden Rauch liest sich anders als einer mit wenig Rauch, und die
     * Lesbarkeit des Feldes ist Design-Prioritaet 4.
     */
    const low = makeLayer(true);
    low.smoke(500, 700);
    const reduced = low.active;

    const full = makeLayer();
    full.smoke(500, 700);

    expect(reduced).toBeGreaterThan(0);
    expect(reduced).toBeLessThan(full.active);
  });
});
