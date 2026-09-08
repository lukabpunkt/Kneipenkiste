/**
 * Ton (GDD §6, Architektur §1).
 *
 * Ein einziges howler-Objekt mit einem Sprite. Das ist keine Sparsamkeit, sondern die
 * einzige Art, die auf iOS verlässlich funktioniert: Audio wird dort erst nach einer
 * echten Nutzergeste freigegeben, und **ein** Element lässt sich in einem Handler
 * entsperren. 32 einzelne Dateien wären 32 Rennen, von denen man manche verliert.
 *
 * Nicht verhandelbar (Audit A3): **Stumm ist voll spielbar.** Alles hier scheitert still.
 * Wenn der Ton fehlt, fehlt der Ton — nicht die Runde.
 */

import { Howl, Howler } from 'howler';

interface SpriteFile {
  format: string[];
  sprite: Record<string, [number, number, boolean?]>;
}

/** Die Musik läuft leiser als die Effekte — sie trägt, sie steht nicht im Weg. */
const MUSIC_MIX = 0.45;

let howl: Howl | undefined;
let spriteMap: SpriteFile['sprite'] = {};
let loading: Promise<void> | undefined;

let soundOn = true;
let musicVolume = 0.6;
let unlocked = false;

/** Was gerade in Schleife läuft — beim Screenwechsel wird es abgelöst, nicht gestapelt. */
let musicId: number | undefined;
let musicKey: string | undefined;

export function setSoundEnabled(value: boolean): void {
  soundOn = value;
  if (!value) stopMusic();
}

export function isSoundEnabled(): boolean {
  return soundOn;
}

export function setMusicVolume(value: number): void {
  musicVolume = Math.max(0, Math.min(1, value));
  if (musicId !== undefined) howl?.volume(musicVolume * MUSIC_MIX, musicId);
}

/**
 * Lädt das Sprite. Mehrfachaufrufe teilen sich dieselbe Promise.
 *
 * Scheitert das Laden, bleibt `howl` leer und jedes spätere `play()` tut nichts — das
 * Spiel läuft dann stumm weiter, wie mit ausgeschaltetem Ton.
 */
export function loadAudio(): Promise<void> {
  loading ??= (async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const response = await fetch(`${base}audio/sprite.json`);
      const file = (await response.json()) as SpriteFile;
      spriteMap = file.sprite;

      /* howler will `[start, dauer]` und den Loop-Schalter getrennt. */
      const sprite: Record<string, [number, number] | [number, number, boolean]> = {};
      for (const [key, value] of Object.entries(file.sprite)) {
        sprite[key] = value[2] ? [value[0], value[1], true] : [value[0], value[1]];
      }

      howl = new Howl({
        src: file.format.map((ext) => `${base}audio/sprite.${ext}`),
        sprite,
        preload: true,
        html5: false,
      });
    } catch (error) {
      console.warn('[audio] Sprite konnte nicht geladen werden — es bleibt still.', error);
    }
  })();
  return loading;
}

/** Im Hintergrund laden, während geredet wird. */
export function preloadAudio(): void {
  void loadAudio();
}

/**
 * Entsperrt den Ton. **Muss synchron aus einem echten Nutzer-Event kommen** — ein
 * `await` davor, und iOS zählt die Geste nicht mehr.
 */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  try {
    const context = Howler.ctx as AudioContext | undefined;
    void context?.resume();
  } catch {
    /* Kein AudioContext — dann eben stumm. */
  }
}

/** Ein Effekt. Unbekannte Keys sind still, kein Fehler. */
export function play(key: string): void {
  if (!soundOn || !howl || !spriteMap[key]) return;
  try {
    howl.play(key);
  } catch {
    /* Ein nicht abspielbarer Sound darf die Show nicht anhalten. */
  }
}

/**
 * Wechselt die Hintergrundmusik.
 *
 * Derselbe Titel wird nicht neu gestartet: Der Router baut Screens neu auf, und eine
 * Musik, die bei jedem Wipe von vorn anfängt, ist schlimmer als keine.
 */
export function playMusic(key: string): void {
  if (!soundOn || !howl || !spriteMap[key]) return;
  if (musicKey === key && musicId !== undefined) return;

  stopMusic();
  try {
    const id = howl.play(key);
    howl.loop(true, id);
    howl.volume(musicVolume * MUSIC_MIX, id);
    musicId = id;
    musicKey = key;
  } catch {
    musicId = undefined;
    musicKey = undefined;
  }
}

export function stopMusic(): void {
  if (musicId !== undefined) howl?.stop(musicId);
  musicId = undefined;
  musicKey = undefined;
}

/** Im Hintergrund schweigt das Spiel — sonst tickt die Uhr in der Hosentasche weiter. */
export function suspendAudio(): void {
  try {
    void (Howler.ctx as AudioContext | undefined)?.suspend();
  } catch {
    /* egal */
  }
}

export function resumeAudio(): void {
  if (!soundOn) return;
  try {
    void (Howler.ctx as AudioContext | undefined)?.resume();
  } catch {
    /* egal */
  }
}

/** Nur für Tests. */
export function audioSpriteKeys(): string[] {
  return Object.keys(spriteMap).sort();
}
