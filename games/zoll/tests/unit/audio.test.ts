/**
 * Audio (GDD §6, Audit A3).
 *
 * Geprüft wird das, was zählt, wenn kein Lautsprecher da ist: dass alle Cues aus dem GDD
 * existieren, dass ihre Rezepte sinnvoll sind — und vor allem, dass **stumm alles
 * funktioniert**. Ein Spiel, das ohne Ton hängen bleibt, ist auf einer Party unbrauchbar.
 */

import { describe, expect, it } from 'vitest';
import {
  AUDIO_CUES,
  cueSpec,
  duckMusic,
  isAudioEnabled,
  isAudioUnlocked,
  play,
  resumeAudio,
  setAudioEnabled,
  setMusicVolume,
  startBelt,
  startTicking,
  stopBelt,
  stopTicking,
  suspendAudio,
  unduckMusic,
  type AudioCue,
} from '@/audio/AudioManager';

/** Die Liste aus GDD §6. Fehlt hier einer, fehlt er im Spiel. */
const CUES_FROM_GDD: AudioCue[] = [
  'ui_tap',
  'ui_confirm',
  'pass_whoosh',
  'zipper_close',
  'tag_clip',
  'belt_loop',
  'belt_stop',
  'hint_wobble',
  'hint_drip',
  'hint_heavy_creak',
  'hint_click',
  'hint_feather',
  'dog_sniff',
  'dog_bark',
  'timer_tick',
  'xray_powerup',
  'scanline_loop',
  'scan_stall',
  'alarm_burst',
  'siren_short',
  'whistle',
  'items_fountain',
  'duck_squeak',
  'stamp_ok',
  'stamp_busted',
  'crowd_aww',
  'crowd_laugh',
  'crowd_gasp',
  'record_scratch',
  'red_carpet',
  'moonwalk_sting',
  'confetti',
];

describe('Cue-Liste', () => {
  it('enthält jeden Sound aus GDD §6', () => {
    for (const cue of CUES_FROM_GDD) {
      expect(AUDIO_CUES, cue).toContain(cue);
    }
  });

  it('hat keine Cues, die im GDD nicht stehen', () => {
    expect([...AUDIO_CUES].sort()).toEqual([...CUES_FROM_GDD].sort());
  });
});

describe('Klangrezepte', () => {
  it('bleibt kurz genug für eine Partyumgebung', () => {
    for (const cue of AUDIO_CUES) {
      const spec = cueSpec(cue);
      /* Über 1.2 s hört auf einem Handy in der Tischmitte niemand mehr zu. */
      expect(spec.durationMs, cue).toBeLessThanOrEqual(1200);
      expect(spec.durationMs, cue).toBeGreaterThan(0);
    }
  });

  it('übersteuert nicht', () => {
    for (const cue of AUDIO_CUES) {
      const spec = cueSpec(cue);
      expect(spec.gain, cue).toBeGreaterThan(0);
      expect(spec.gain, cue).toBeLessThanOrEqual(0.6);
    }
  });

  it('gibt dem Alarm mehr Gewicht als der Bedienung', () => {
    /* Ein Alarm, der leiser ist als ein Tap, ist kein Alarm. */
    expect(cueSpec('alarm_burst').gain).toBeGreaterThan(cueSpec('ui_tap').gain * 2);
  });

  it('lässt Waldi hörbar zweimal bellen', () => {
    /* Das Bellen ist der einzige Hinweis, der nie lügt — es muss sich abheben. */
    expect(cueSpec('dog_bark').repeat?.times).toBe(2);
    expect(cueSpec('dog_bark').gain).toBeGreaterThan(cueSpec('dog_sniff').gain);
  });

  it('hält Sweeps in einem hörbaren Bereich', () => {
    for (const cue of AUDIO_CUES) {
      const spec = cueSpec(cue);
      expect(spec.freq, cue).toBeGreaterThan(20);
      expect(spec.freq, cue).toBeLessThan(20_000);
      if (spec.sweepTo !== undefined) {
        expect(spec.sweepTo, cue).toBeGreaterThan(20);
        expect(spec.sweepTo, cue).toBeLessThan(20_000);
      }
    }
  });
});

describe('Stumm ist vollständig spielbar (GDD §6)', () => {
  it('wirft nie, auch ohne AudioContext', () => {
    /*
     * In jsdom gibt es keinen AudioContext. Jeder Aufruf muss trotzdem still
     * durchlaufen — sonst reißt ein fehlender Lautsprecher die ganze Runde ab.
     */
    expect(isAudioUnlocked()).toBe(false);

    for (const cue of AUDIO_CUES) {
      expect(() => play(cue)).not.toThrow();
      expect(() => play(cue, 0.5, 3)).not.toThrow();
    }

    expect(() => startBelt()).not.toThrow();
    expect(() => stopBelt()).not.toThrow();
    expect(() => startTicking()).not.toThrow();
    expect(() => stopTicking()).not.toThrow();
    expect(() => duckMusic()).not.toThrow();
    expect(() => unduckMusic()).not.toThrow();
    expect(() => suspendAudio()).not.toThrow();
    expect(() => resumeAudio()).not.toThrow();
    expect(() => setMusicVolume(0.3)).not.toThrow();
  });

  it('lässt sich abschalten und wieder einschalten', () => {
    setAudioEnabled(false);
    expect(isAudioEnabled()).toBe(false);
    expect(() => play('alarm_burst')).not.toThrow();

    setAudioEnabled(true);
    expect(isAudioEnabled()).toBe(true);
  });

  it('klemmt die Musiklautstärke auf 0…1', () => {
    expect(() => setMusicVolume(-2)).not.toThrow();
    expect(() => setMusicVolume(9)).not.toThrow();
  });
});
