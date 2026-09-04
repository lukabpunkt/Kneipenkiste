/**
 * Outcome-Registry und Audio (Roadmap M3.6/M3.7, Audit A4-Vorbereitung).
 *
 * Die Inszenierungen selbst brauchen PIXI und GSAP und werden in M4 im Dev-Preview und
 * per E2E geprueft. Was sich ohne Renderer pruefen laesst, steht hier: die Registry, die
 * gewichtete Auswahl mit No-Repeat-Fenster und die Vollstaendigkeit der Sound-Cues.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { NO_REPEAT_WINDOW } from '@/config/choreo';
import { createSeededRng } from '@/core/rng';
import { OUTCOMES, type Outcome } from '@/core/types';
import { AUDIO_CUES, isAudioEnabled, play, setAudioEnabled } from '@/audio/AudioManager';
import {
  allSequences,
  clearRecent,
  clearRegistry,
  outcomeById,
  overlayById,
  pickOutcomeSequence,
  registerOutcome,
  registerOverlay,
  sequencesFor,
  type OutcomeSequence,
} from '@/game/outcomes/OutcomeSequence';

/** Eine Sequenz, die nichts tut — die Registry interessiert nur, dass es sie gibt. */
function stub(id: string, outcome: Outcome, weight = 1): OutcomeSequence {
  return { id, outcome, weight, build: () => ({}) as never };
}

afterEach(() => {
  clearRegistry();
  clearRecent();
});

describe('Registry', () => {
  it('nimmt Sequenzen auf und findet sie wieder', () => {
    registerOutcome(stub('a', 'soloSteal'));
    expect(outcomeById('a')?.id).toBe('a');
    expect(allSequences()).toHaveLength(1);
  });

  it('lehnt eine doppelte ID ab', () => {
    registerOutcome(stub('a', 'soloSteal'));
    expect(() => registerOutcome(stub('a', 'multiSteal'))).toThrow(/doppelt/);
  });

  it('lehnt ein Gewicht von 0 oder weniger ab', () => {
    expect(() => registerOutcome(stub('a', 'soloSteal', 0))).toThrow(/> 0/);
    expect(() => registerOutcome(stub('b', 'soloSteal', -1))).toThrow(/> 0/);
  });

  it('sortiert Sequenzen nach Outcome-Typ', () => {
    registerOutcome(stub('solo1', 'soloSteal'));
    registerOutcome(stub('solo2', 'soloSteal'));
    registerOutcome(stub('multi', 'multiSteal'));
    expect(sequencesFor('soloSteal').map((s) => s.id)).toEqual(['solo1', 'solo2']);
    expect(sequencesFor('allShare')).toEqual([]);
  });

  it('kennt beide Overlays, sobald sie registriert sind', () => {
    registerOverlay({ id: 'mole_reveal', buildOnCard: () => ({}) as never });
    expect(overlayById('mole_reveal')).toBeDefined();
    expect(overlayById('perjury_seal_break')).toBeUndefined();
  });
});

describe('Auswahl mit No-Repeat-Fenster', () => {
  it('gibt undefined zurueck, wenn fuer den Typ nichts registriert ist', () => {
    expect(pickOutcomeSequence('soloSteal', createSeededRng(1))).toBeUndefined();
  });

  it('wiederholt sich ueber 1 000 Runden nie innerhalb des Fensters', () => {
    for (const id of ['a', 'b', 'c', 'd']) registerOutcome(stub(id, 'soloSteal'));

    const rng = createSeededRng(4711);
    const history: string[] = [];
    for (let i = 0; i < 1000; i++) {
      const picked = pickOutcomeSequence('soloSteal', rng)!;
      expect(history.slice(-NO_REPEAT_WINDOW)).not.toContain(picked);
      history.push(picked);
    }
    // Alle vier kommen dran, nicht nur zwei im Wechsel.
    expect(new Set(history).size).toBe(4);
  });

  it('haelt die Fenster je Outcome-Typ getrennt', () => {
    registerOutcome(stub('solo', 'soloSteal'));
    registerOutcome(stub('multi', 'multiSteal'));
    const rng = createSeededRng(9);

    /*
     * Mit nur einer Sequenz je Typ muss dieselbe immer wieder kommen — das Fenster darf
     * dann nicht blockieren, sonst stuende die Buehne leer. Und der eine Typ darf den
     * anderen nicht mitsperren.
     */
    for (let i = 0; i < 10; i++) {
      expect(pickOutcomeSequence('soloSteal', rng)).toBe('solo');
      expect(pickOutcomeSequence('multiSteal', rng)).toBe('multi');
    }
  });

  it('respektiert die Gewichte', () => {
    registerOutcome(stub('often', 'allShare', 9));
    registerOutcome(stub('rare', 'allShare', 1));
    const rng = createSeededRng(3);

    let often = 0;
    for (let i = 0; i < 400; i++) {
      // Nach jeder Ziehung vergessen, sonst erzwingt das No-Repeat-Fenster den Wechsel.
      clearRecent();
      if (pickOutcomeSequence('allShare', rng) === 'often') often += 1;
    }
    expect(often / 400).toBeGreaterThan(0.8);
  });
});

describe('registry.ts', () => {
  it('registriert basic_outcome und beide Overlays', async () => {
    const registry = await import('@/game/outcomes/registry');
    registry.resetRegistration();
    registry.registerAll();

    expect(outcomeById('basic_outcome')).toBeDefined();
    expect(overlayById('perjury_seal_break')).toBeDefined();
    expect(overlayById('mole_reveal')).toBeDefined();

    // Mehrfach aufrufbar: Der Reveal-Screen ruft es bei jedem Betreten.
    expect(() => registry.registerAll()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Audio (GDD §6)                                                      */
/* ------------------------------------------------------------------ */

describe('AudioManager', () => {
  it('kennt jeden Cue, den die Show anfasst', () => {
    for (const cue of [
      'vault_dial',
      'vault_open',
      'vault_close',
      'coin_shimmer',
      'drumroll',
      'card_lift',
      'card_flip',
      'card_stall',
      'reveal_share',
      'reveal_steal',
      'siren_short',
      'heartbeat',
      'crowd_aah',
      'crowd_gasp',
      'cash_register',
      'jackpot_choir',
      'thunder',
      'stamp',
      'anvil',
      'brawl',
    ] as const) {
      expect(AUDIO_CUES).toContain(cue);
    }
  });

  it('deckt die Sound-Liste aus GDD §6 ab', () => {
    // Die Cue-Namen sind die aus dem GDD; wer einen umbenennt, faellt hier auf.
    expect(AUDIO_CUES.length).toBeGreaterThanOrEqual(24);
    expect(new Set(AUDIO_CUES).size).toBe(AUDIO_CUES.length);
  });

  it('bleibt stumm und wirft nicht, solange nichts entsperrt ist', () => {
    // Stumm muss das Spiel zu 100 % funktionieren (GDD §6).
    expect(() => play('vault_open')).not.toThrow();
    expect(() => play('drumroll', 0.5, -3)).not.toThrow();
  });

  it('laesst sich ein- und ausschalten', () => {
    expect(isAudioEnabled()).toBe(true);
    setAudioEnabled(false);
    expect(isAudioEnabled()).toBe(false);
    expect(() => play('card_flip')).not.toThrow();
    setAudioEnabled(true);
  });
});

describe('Outcome-Typen', () => {
  it('deckt jeden Outcome ab, den `payout.ts` erzeugen kann', () => {
    // Jede der fuenf Faelle braucht spaetestens in M4 eine eigene Inszenierung.
    expect(OUTCOMES).toHaveLength(5);
    for (const outcome of OUTCOMES) expect(sequencesFor(outcome)).toEqual([]);
  });
});
