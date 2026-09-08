/**
 * Ton (Audit A3).
 *
 * Der wichtigste Test hier ist der langweiligste: **stumm ist voll spielbar**. Alles am
 * Ton scheitert still — ein fehlendes Sprite, ein unbekannter Key, ein Browser ohne
 * AudioContext. Wenn der Ton fehlt, fehlt der Ton, nicht die Runde.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSoundEnabled, play, playMusic, setMusicVolume, setSoundEnabled, stopMusic, unlockAudio } from '@/audio/AudioManager';

/** Die Keys aus GDD §6 — was die Show ruft, muss es im Sprite geben. */
const REQUIRED = [
  'ui_tap', 'ui_confirm', 'pass_whoosh', 'plank_select', 'seal',
  'wind_loop', 'vulture_screech', 'vulture_laugh',
  'footsteps_run', 'step_thud',
  'creak_1', 'creak_2', 'creak_3', 'creak_4', 'rope_strain',
  'plank_snap', 'plank_crumble', 'whistle_fall', 'splash', 'rock_squash',
  'hat_flutter', 'relief_exhale', 'balloon_deflate',
  'hammer_rhythm', 'wood_rot', 'stamp', 'drum_deathzone',
  'crowd_gasp', 'crowd_laugh',
  'music_lobby', 'music_negotiation', 'music_step',
];

interface SpriteFile {
  format: string[];
  sprite: Record<string, [number, number, boolean?]>;
}

const spriteFile = JSON.parse(readFileSync('public/audio/sprite.json', 'utf8')) as SpriteFile;

describe('Das Sprite', () => {
  it('enthält jeden Key aus GDD §6', () => {
    const keys = new Set(Object.keys(spriteFile.sprite));
    for (const key of REQUIRED) expect(keys.has(key), key).toBe(true);
  });

  it('gibt jedem Clip eine echte Länge und eine eigene Stelle', () => {
    const seen = new Set<number>();
    for (const [key, [start, length]] of Object.entries(spriteFile.sprite)) {
      expect(length, `${key} ist 0 ms lang`).toBeGreaterThan(30);
      expect(start, `${key} beginnt zweimal an derselben Stelle`).not.toBe(
        [...seen].find((value) => value === start)
      );
      seen.add(start);
    }
  });

  it('legt die Clips überlappungsfrei hintereinander', () => {
    const entries = Object.entries(spriteFile.sprite).sort(([, a], [, b]) => a[0] - b[0]);
    let previousEnd = -1;
    for (const [key, [start, length]] of entries) {
      expect(start, `${key} überlappt den vorigen Clip`).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = start + length;
    }
  });

  it('markiert Musik und Wind als Schleife, den Rest nicht', () => {
    for (const [key, entry] of Object.entries(spriteFile.sprite)) {
      const loops = entry[2] === true;
      const shouldLoop = key.startsWith('music_') || key.endsWith('_loop');
      expect(loops, key).toBe(shouldLoop);
    }
  });
});

describe('Stumm ist voll spielbar (A3)', () => {
  it('spielt nichts, wenn der Ton aus ist — und wirft nicht', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(() => play('plank_snap')).not.toThrow();
    expect(() => playMusic('music_step')).not.toThrow();
    expect(() => stopMusic()).not.toThrow();
  });

  it('überlebt unbekannte Keys', () => {
    setSoundEnabled(true);
    expect(() => play('gibt_es_nicht')).not.toThrow();
    expect(() => playMusic('gibt_es_auch_nicht')).not.toThrow();
  });

  it('überlebt ein Umfeld ohne geladenes Sprite', () => {
    /* In jsdom gibt es keinen echten AudioContext — genau der Fall, den es aushalten muss. */
    expect(() => unlockAudio()).not.toThrow();
    expect(() => setMusicVolume(0.3)).not.toThrow();
    expect(() => setMusicVolume(5)).not.toThrow();
  });
});

describe('Was die Show ruft', () => {
  it('gibt es alles im Sprite', () => {
    const keys = new Set(Object.keys(spriteFile.sprite));
    const sources = [
      'src/game/StepDirector.ts',
      'src/game/sequences/fall/BasicFall.ts',
      'src/game/sequences/safe/WobbleHold.ts',
      'src/game/sequences/safe/ConfidentStroll.ts',
      'src/game/sequences/safe/Tiptoe.ts',
      'src/game/sequences/misc/AllSafeRot.ts',
      'src/game/sequences/misc/DeathzoneSign.ts',
      'src/game/sequences/misc/RepairCarpenter.ts',
      'src/game/sequences/overlays/RottenCrack.ts',
      'src/game/sequences/overlays/DeserterStamp.ts',
    ];

    const missing: string[] = [];
    for (const file of sources) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/play\('([a-z0-9_]+)'\)/g)) {
        if (!keys.has(match[1]!)) missing.push(`${file}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
