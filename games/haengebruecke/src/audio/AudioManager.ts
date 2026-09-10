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

/*
 * howler wird **dynamisch** geladen (Roadmap M5.5).
 *
 * Beim Import richtet es sich sofort ein: AudioContext anlegen, ein `<audio>`-Element
 * bauen, rund zwanzig Codecs mit `canPlayType` abklopfen. Im CPU-Profil des Starts war
 * das mit 254 ms der größte Einzelposten — für einen Ton, der erst in der Absprache
 * gebraucht wird. Jetzt liegt howler im Audio-Chunk und kommt mit dem Sprite.
 *
 * Bis dahin ist jede Funktion hier still. Das ist genau das dokumentierte Verhalten für
 * "Ton fehlt" (Audit A3) — nur eben für ein paar Sekunden statt für immer.
 */
import type { Howl as HowlType, HowlOptions, HowlerGlobal } from 'howler';

let Howl: (new (options: HowlOptions) => HowlType) | undefined;
let Howler: HowlerGlobal | undefined;

interface SpriteFile {
  format: string[];
  sprite: Record<string, [number, number, boolean?]>;
}

/** Die Musik läuft leiser als die Effekte — sie trägt, sie steht nicht im Weg. */
const MUSIC_MIX = 0.45;

let howl: HowlType | undefined;
let spriteMap: SpriteFile['sprite'] = {};
let loading: Promise<void> | undefined;

let soundOn = true;
let musicVolume = 0.6;
let unlocked = false;

/** Was gerade in Schleife läuft — beim Screenwechsel wird es abgelöst, nicht gestapelt. */
let musicId: number | undefined;
let musicKey: string | undefined;

export function setSoundEnabled(value: boolean): void {
  const wasOff = !soundOn;
  soundOn = value;

  if (!value) {
    stopMusic();
    return;
  }
  /* Eingeschaltet heisst: jetzt laden. Der naechste Effekt soll nicht der erste sein,
     der auf das Sprite wartet. */
  if (wasOff) void loadAudio();
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
  /*
   * Ton aus heisst Ton aus — kein Sprite, kein AudioContext.
   *
   * Bisher wurde beides auch bei stummem Spiel angelegt: 316 KB laden und einen
   * AudioContext oeffnen, den niemand benutzt. Auf einer Maschine mit belegtem Audio-
   * Geraet meldet der Browser dann "The AudioContext encountered an error from the audio
   * device" auf die Konsole — im E2E ein Fehlschlag, auf einem Handy eine Warnung ohne
   * Anlass. `setSoundEnabled(true)` holt das Laden sofort nach.
   */
  if (!soundOn) return Promise.resolve();

  loading ??= (async () => {
    try {
      const base = import.meta.env.BASE_URL;
      /* Erst die Beschreibung holen — ohne Sprite braucht es howler gar nicht. */
      const response = await fetch(`${base}audio/sprite.json`);
      const file = (await response.json()) as SpriteFile;
      spriteMap = file.sprite;

      /* howler will `[start, dauer]` und den Loop-Schalter getrennt. */
      const sprite: Record<string, [number, number] | [number, number, boolean]> = {};
      for (const [key, value] of Object.entries(file.sprite)) {
        sprite[key] = value[2] ? [value[0], value[1], true] : [value[0], value[1]];
      }

      const howler = await import('howler');
      Howl = howler.Howl;
      Howler = howler.Howler;

      howl = new Howl({
        src: file.format.map((ext) => `${base}audio/sprite.${ext}`),
        sprite,
        preload: true,
        html5: false,
      });

      /*
       * Wurde vor dem Laden schon getippt, ist die Geste vorbei. howler hängt sich beim
       * Erzeugen selbst an den nächsten Tap, um zu entsperren — hier wird nur der schon
       * gestellte Antrag nachgeholt, falls der Browser ihn annimmt.
       */
      if (unlocked) resumeContext();
    } catch (error) {
      console.warn('[audio] Sprite konnte nicht geladen werden — es bleibt still.', error);
    }
  })();
  return loading;
}

/** Der AudioContext ist erst nach dem dynamischen Import da. */
function resumeContext(): void {
  try {
    void (Howler?.ctx as AudioContext | undefined)?.resume();
  } catch {
    /* Kein AudioContext — dann eben stumm. */
  }
}

/**
 * Im Hintergrund laden — aber erst, wenn der Titel steht.
 *
 * Beim Start aufgerufen würde es sich mit dem ersten Bild um den Hauptthread streiten:
 * 316 KB holen, dekodieren, howler einrichten. Der Titel braucht keinen Ton, die Lobby
 * schon — und zwischen beiden liegt mindestens ein Tap.
 */
export function preloadAudio(): void {
  const start = (): void => void loadAudio();
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => void })
    .requestIdleCallback;

  const schedule = (): void => {
    if (idle) idle(start, { timeout: 2000 });
    else globalThis.setTimeout(start, 400);
  };

  if (document.readyState === 'complete') schedule();
  else globalThis.addEventListener('load', schedule, { once: true });
}

/**
 * Entsperrt den Ton. **Muss synchron aus einem echten Nutzer-Event kommen** — ein
 * `await` davor, und iOS zählt die Geste nicht mehr.
 */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  resumeContext();
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
    void (Howler?.ctx as AudioContext | undefined)?.suspend();
  } catch {
    /* egal */
  }
}

export function resumeAudio(): void {
  if (!soundOn) return;
  resumeContext();
}

/** Nur für Tests. */
export function audioSpriteKeys(): string[] {
  return Object.keys(spriteMap).sort();
}
