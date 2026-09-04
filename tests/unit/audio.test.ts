/**
 * Audio (Roadmap M3.6, GDD §6, ADR-13).
 *
 * Wie es klingt, entscheidet das Ohr. Hier steht, was messbar ist:
 *
 * 1. **Alle Cues aus GDD §6 existieren** — ein fehlender Name faellt sonst erst auf,
 *    wenn im Spiel eine Stelle stumm bleibt.
 * 2. **Die Cues landen auf der Audio-Uhr, wo sie hingehoert haben.** Audit A3 fordert
 *    Sound-Sync ± 50 ms; genau dafuer plant `play(cue, when)` vor, statt im Frame-Loop
 *    zu triggern. Der Test rechnet den geplanten Startzeitpunkt nach.
 * 3. **Ohne Audio faellt nichts aus.** "Stumm voll spielbar" (GDD §6) heisst: Kein
 *    Aufruf wirft, auch wenn es gar keinen AudioContext gibt.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AUDIO_CUES,
  cueSpec,
  currentMusic,
  isAudioUnlocked,
  play,
  setAudioEnabled,
  setMusicVolume,
  startMusic,
  stopMusic,
  suspendAudio,
  resumeAudio,
  tickTurn,
  unlockAudio,
  type AudioCue,
} from '@/audio/AudioManager';

/* ------------------------------------------------------------------ */
/* Ein AudioContext aus Pappe                                          */
/* ------------------------------------------------------------------ */

interface StartedSource {
  at: number;
  freq: number;
}

const started: StartedSource[] = [];

function fakeParam(): {
  value: number;
  setValueAtTime: (v: number, t: number) => void;
  exponentialRampToValueAtTime: (v: number, t: number) => void;
} {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

function fakeNode(): {
  connect: () => void;
  gain: ReturnType<typeof fakeParam>;
  frequency: ReturnType<typeof fakeParam>;
} {
  return { connect: () => undefined, gain: fakeParam(), frequency: fakeParam() };
}

class FakeAudioContext {
  currentTime = 10;
  sampleRate = 48000;
  destination = fakeNode();

  createGain() {
    return fakeNode();
  }
  createBiquadFilter() {
    return { ...fakeNode(), type: 'lowpass' };
  }
  createBuffer(_channels: number, frames: number) {
    const data = new Float32Array(frames);
    return { getChannelData: () => data };
  }
  createOscillator() {
    const node = fakeNode();
    let freq = 0;
    node.frequency.setValueAtTime = (value: number) => {
      freq = value;
    };
    return {
      ...node,
      type: 'sine' as OscillatorType,
      start: (at: number) => void started.push({ at, freq }),
      stop: () => undefined,
    };
  }
  createBufferSource() {
    const node = fakeNode();
    return { ...node, buffer: null, start: () => undefined, stop: () => undefined };
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
}

type AudioContextCtor = typeof AudioContext;
type Global = typeof globalThis & { AudioContext?: AudioContextCtor };

/* ------------------------------------------------------------------ */

describe('Cue-Tabelle (GDD §6)', () => {
  /** Die Liste aus dem GDD, wortwoertlich. `explosion` und `shovel_dig` sind dort Gruppen. */
  const REQUIRED: readonly AudioCue[] = [
    'ui_tap',
    'ui_confirm',
    'pass_whoosh',
    'mine_place',
    'plate_stomp',
    'shovel_dig',
    'plate_flip',
    'worm_squeak',
    'temp_hot',
    'temp_warm',
    'temp_cold',
    'fuse_click',
    'explosion_s',
    'explosion_m',
    'explosion_l',
    'helmet_bonk',
    'whistle_fall',
    'tree_rustle',
    'dud_pfff',
    'treasure_fanfare',
    'bottle_clink',
    'crowd_ooh',
    'crowd_laugh',
    'crowd_gasp',
    'confetti',
    'turn_tick',
  ];

  it('kennt jeden Cue aus dem GDD', () => {
    for (const cue of REQUIRED) expect(AUDIO_CUES, cue).toContain(cue);
  });

  it('hat keinen Cue, den das GDD nicht nennt', () => {
    expect([...AUDIO_CUES].sort()).toEqual([...REQUIRED].sort());
  });

  it('beschreibt jeden Cue plausibel', () => {
    for (const cue of AUDIO_CUES) {
      const spec = cueSpec(cue);
      expect(spec.freq, cue).toBeGreaterThan(20);
      expect(spec.freq, cue).toBeLessThan(20000);
      expect(spec.gain, cue).toBeGreaterThan(0);
      // Nichts uebersteuert, und nichts ist so laut, dass es den Rest zudeckt.
      expect(spec.gain, cue).toBeLessThanOrEqual(0.6);
      expect(spec.durationMs, cue).toBeGreaterThan(0);
      /*
       * Kein Cue laenger als eine Sekunde: Sie liegen in Sequenzen, die selbst nur
       * 800 ms dauern — ein laengerer Ton wuerde in den naechsten Zug hineinragen.
       */
      expect(spec.durationMs, cue).toBeLessThanOrEqual(1000);
    }
  });

  it('macht die drei Explosionsgroessen tiefer, je groesser sie werden', () => {
    expect(cueSpec('explosion_m').freq).toBeLessThan(cueSpec('explosion_s').freq);
    expect(cueSpec('explosion_l').freq).toBeLessThan(cueSpec('explosion_m').freq);
    // Und lauter — ein Doppelstapel muss sich auch anders anfuehlen.
    expect(cueSpec('explosion_l').gain).toBeGreaterThan(cueSpec('explosion_s').gain);
  });

  it('gibt den drei Temperaturen verschiedene Klangfarben, nicht nur Tonhoehen', () => {
    /*
     * Auf einem Handy-Lautsprecher in einer lauten Runde traegt die Klangfarbe weiter
     * als die Hoehe (Art Direction §2) — deshalb Zischen, Glocke, Klirren.
     */
    const hot = cueSpec('temp_hot');
    const warm = cueSpec('temp_warm');
    const cold = cueSpec('temp_cold');
    expect(hot.noise).toBeGreaterThan(0);
    expect(warm.noise).toBeUndefined();
    expect(cold.wave).not.toBe(warm.wave);
  });
});

/* ------------------------------------------------------------------ */

describe('Ohne Audio (GDD §6: stumm voll spielbar)', () => {
  it('wirft nirgends, wenn es keinen AudioContext gibt', () => {
    const scope = globalThis as Global;
    const saved = scope.AudioContext;
    delete scope.AudioContext;

    expect(() => {
      unlockAudio();
      play('ui_tap');
      tickTurn();
      startMusic('lobby');
      setMusicVolume(0.3);
      suspendAudio();
      resumeAudio();
      stopMusic();
    }).not.toThrow();
    expect(isAudioUnlocked()).toBe(false);

    if (saved !== undefined) scope.AudioContext = saved;
  });
});

/* ------------------------------------------------------------------ */

describe('Zeitplanung auf der Audio-Uhr (Audit A3: ± 50 ms)', () => {
  const scope = globalThis as Global;
  let saved: AudioContextCtor | undefined;

  beforeEach(() => {
    saved = scope.AudioContext;
    scope.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    started.length = 0;
    setAudioEnabled(true);
    unlockAudio();
  });

  afterEach(() => {
    stopMusic();
    if (saved === undefined) delete scope.AudioContext;
    else scope.AudioContext = saved;
  });

  it('entsperrt genau einmal', () => {
    expect(isAudioUnlocked()).toBe(true);
    unlockAudio();
    expect(isAudioUnlocked()).toBe(true);
  });

  it('plant einen Cue exakt auf `currentTime + when`', () => {
    /*
     * Das ist der ganze Grund fuer die Synthese (ADR-13): Ein Ton, der im Frame-Loop
     * ausgeloest wird, kommt bei 30 fps bis zu 33 ms zu spaet — und bei fuenf Toenen
     * fuenfmal unabhaengig davon. Hier liegt der Fehler bei null.
     */
    play('ui_tap', 0.25);
    expect(started).toHaveLength(1);
    expect(started[0]!.at).toBeCloseTo(10.25, 6);
  });

  it('haelt den Abstand zwischen vorgeplanten Cues exakt ein', () => {
    const offsets = [0, 0.12, 0.24];
    for (const offset of offsets) play('shovel_dig', offset);

    expect(started).toHaveLength(offsets.length);
    for (const [index, offset] of offsets.entries()) {
      const drift = Math.abs(started[index]!.at - (10 + offset)) * 1000;
      expect(drift, `Cue ${index}`).toBeLessThan(1);
    }
  });

  it('stimmt einen Cue in Halbtoenen um', () => {
    play('worm_squeak', 0, 12);
    expect(started[0]!.freq).toBeCloseTo(cueSpec('worm_squeak').freq * 2, 6);
  });

  it('spielt nichts, wenn der Ton ausgeschaltet ist', () => {
    setAudioEnabled(false);
    play('ui_tap');
    expect(started).toHaveLength(0);
    setAudioEnabled(true);
  });

  it('startet den Loop und laesst ihn beim zweiten Aufruf in Ruhe', () => {
    startMusic('dig');
    expect(currentMusic()).toBe('dig');
    const planned = started.length;
    expect(planned).toBeGreaterThan(0);

    startMusic('dig');
    expect(started).toHaveLength(planned);
  });

  it('wechselt den Loop zwischen Lobby und Grabung', () => {
    startMusic('lobby');
    expect(currentMusic()).toBe('lobby');
    startMusic('dig');
    expect(currentMusic()).toBe('dig');
    stopMusic();
    expect(currentMusic()).toBeUndefined();
  });
});
