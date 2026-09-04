/**
 * UI-Bausteine, die eigene Logik tragen (Roadmap M1.1).
 *
 * Die Screens selbst deckt die E2E-Suite ab; hier stehen die Rechenteile, die man
 * sonst nur ueber einen ganzen Durchlauf treffen wuerde.
 */

import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/config/rules';
import { SCREEN_ORDER } from '@/ui/router';
import { HAPTIC_PATTERNS } from '@/ui/haptics';
import { vaultFill } from '@/ui/components/vaultWidget';
import { GAME_STATES } from '@/core/fsm';
import { flatKeys, setLocale, t } from '@/core/i18n';
import { vaultSpec } from '@/core/vault';
import { makeSettings } from './helpers';

describe('vaultFill', () => {
  const spec = vaultSpec(makeSettings({ hardness: 'normal' }));

  it('laeuft von leer bis voll', () => {
    expect(vaultFill(0, spec)).toBe(0);
    expect(vaultFill(8, spec)).toBe(0.5);
    expect(vaultFill(16, spec)).toBe(1);
  });

  it('laeuft im Highroller-Modus nicht ueber', () => {
    const high = vaultSpec(makeSettings({}, { highroller: true }));
    // Ohne Deckel kann der Tresor die Jackpot-Schwelle ueberschreiten — der Pegel bleibt
    // dann oben stehen, statt aus dem Fenster zu laufen.
    expect(vaultFill(30, high)).toBe(1);
  });

  it('kommt mit einer unsinnigen Schwelle klar', () => {
    expect(vaultFill(5, { startVault: 0, growth: 0, jackpotAt: 0, capped: true })).toBe(0);
  });
});

describe('Router', () => {
  it('kennt einen Screen fuer jeden FSM-State', () => {
    const screens = new Set<string>(SCREEN_ORDER);
    for (const state of GAME_STATES) {
      expect(screens.has(state.toLowerCase())).toBe(true);
    }
  });

  it('ordnet die Screens so, wie das Spiel laeuft', () => {
    expect([...SCREEN_ORDER]).toEqual([
      'title',
      'lobby',
      'negotiation',
      'silence',
      'pass',
      'choice',
      'sealed',
      'reveal',
      'distribute',
      'result',
    ]);
  });
});

describe('Haptik', () => {
  it('kennt ein Muster fuer jeden Moment, an dem es vibriert', () => {
    for (const key of ['tap', 'seal', 'coin', 'lastCard', 'alarm'] as const) {
      expect(HAPTIC_PATTERNS[key]).toBeDefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/* Vollstaendigkeit der Texte (CLAUDE.md: kein hardcodierter String)   */
/* ------------------------------------------------------------------ */

describe('i18n-Abdeckung der Screens', () => {
  /** Jeder Key, den die Screens in M1 anfassen. */
  const USED_KEYS = [
    'app.title',
    'app.tagline',
    'title.play',
    'title.rules',
    'title.settings',
    'title.sound',
    'title.disclaimer',
    'lobby.headline',
    'lobby.addPlayer',
    'lobby.namePlaceholder',
    'lobby.cta',
    'lobby.tooFewPlayers',
    'lobby.tooManyPlayers',
    'lobby.hardness',
    'lobby.hardnessSoft',
    'lobby.hardnessNormal',
    'lobby.hardnessHard',
    'lobby.negotiationTime',
    'lobby.revealPace',
    'lobby.paceShort',
    'lobby.paceNormal',
    'lobby.paceLong',
    'lobby.thinkTimer',
    'lobby.seconds',
    'modes.headline',
    'modes.oath',
    'modes.oathHint',
    'modes.mole',
    'modes.moleHint',
    'modes.nightShift',
    'modes.nightShiftHint',
    'modes.highroller',
    'modes.highrollerHint',
    'negotiation.headline',
    'negotiation.allReady',
    'negotiation.vaultLabel',
    'negotiation.tableHeadline',
    'negotiation.tableNoThief',
    'negotiation.tableSoloThief',
    'negotiation.tableMultiThief',
    'negotiation.tableAllThieves',
    'negotiation.tableThiefDistributes',
    'negotiation.tableEachDrinks',
    'negotiation.tableNextVault',
    'negotiation.swear',
    'silence.headline',
    'silence.body',
    'pass.headline',
    'pass.body',
    'choice.headline',
    'choice.sub',
    'choice.sealed',
    'choice.moleHeadline',
    'choice.moleSub',
    'choice.moleLocked',
    'choice.thinkTimer',
    'choice.autoShared',
    'sealed.headline',
    'sealed.body',
    'sealed.cta',
    'reveal.skipHint',
    'distribute.headline',
    'distribute.sub',
    'distribute.remaining_one',
    'distribute.remaining_other',
    'distribute.cta',
    'distribute.handover',
    'result.allShare',
    'result.jackpot',
    'result.soloSteal',
    'result.multiSteal',
    'result.allSteal',
    'result.perjury',
    'result.mole',
    'result.drinks',
    'result.distributionLine',
    'result.fee',
    'result.vaultGrows',
    'result.vaultReset',
    'result.vaultBurst',
    'result.nextRound',
    'result.changePlayers',
    'result.stats',
    'result.scoreboard',
    'result.trustIndex',
    'result.betrayalStreak',
    'result.mostBetrayed',
    'rules.headline',
    'rules.vaultTitle',
    'rules.vaultBody',
    'rules.negotiateTitle',
    'rules.negotiateBody',
    'rules.chooseTitle',
    'rules.chooseBody',
    'rules.payoutTitle',
    'rules.payoutBody',
    'settings.headline',
    'settings.sound',
    'settings.music',
    'settings.haptics',
    'settings.lowEffects',
    'settings.language',
    'settings.reset',
    'dialog.abortRound',
    'dialog.abortRoundBody',
    'dialog.abortConfirm',
    'dialog.abortKeep',
    'common.share',
    'common.steal',
    'common.on',
    'common.off',
    'common.close',
    'common.confirm',
    'common.continue',
    'orientation.headline',
    'orientation.body',
  ] as const;

  for (const locale of LOCALES) {
    it(`${locale}: kennt jeden Key, den die Screens brauchen`, () => {
      setLocale(locale);
      const missing = USED_KEYS.filter((key) => t(key).startsWith('[missing:'));
      expect(missing).toEqual([]);
      setLocale('de');
    });
  }

  it('hat keine verwaisten Keys ausserhalb der bekannten Bereiche', () => {
    const prefixes = new Set(flatKeys('de').map((key) => key.split('.')[0]));
    expect([...prefixes].sort()).toEqual([
      'app',
      'choice',
      'common',
      'dialog',
      'distribute',
      'kassel',
      'lobby',
      'modes',
      'negotiation',
      'orientation',
      'pass',
      'result',
      'reveal',
      'rules',
      'sealed',
      'settings',
      'silence',
      'title',
    ]);
  });
});
