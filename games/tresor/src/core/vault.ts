/**
 * Tresor-Oekonomie (GDD §3.2, ADR-2).
 *
 * Der Tresor ist die Eskalationsmaschine des Spiels: Frieden kostet Gebuehr, der Inhalt
 * waechst, und am Deckel platzt er. Alle Zahlen kommen aus `config/rules.ts`.
 */

import { HIGHROLLER, hardnessSpec, type Settings } from '@/config/rules';

export interface VaultSpec {
  /** V_0 — Start und Reset-Wert. */
  startVault: number;
  /** Zuwachs pro Friedensrunde. */
  growth: number;
  /** Ab hier platzt der Tresor in einer Friedensrunde (Jackpot). */
  jackpotAt: number;
  /**
   * Klassik: Das Wachstum stoppt am Deckel, der Tresor wartet dort auf den Jackpot.
   * Highroller: kein Deckel — der Tresor waechst ueber die Schwelle hinaus (GDD §3.7).
   */
  capped: boolean;
}

/**
 * Die geltende Oekonomie. Highroller ueberschreibt die Haerte-Tabelle komplett —
 * "Fuer Gruppen, die es wollen" (GDD §3.7).
 */
export function vaultSpec(settings: Pick<Settings, 'hardness' | 'modes'>): VaultSpec {
  if (settings.modes.highroller) {
    return {
      startVault: HIGHROLLER.startVault,
      growth: HIGHROLLER.growth,
      jackpotAt: HIGHROLLER.jackpotAt,
      capped: false,
    };
  }
  const spec = hardnessSpec(settings.hardness);
  return {
    startVault: spec.startVault,
    growth: spec.growth,
    jackpotAt: spec.cap,
    capped: true,
  };
}

/** V_max — nur in der gedeckelten Klassik-Variante ein echter Deckel. */
export function maxVault(spec: VaultSpec): number {
  return spec.capped ? spec.jackpotAt : Number.POSITIVE_INFINITY;
}

/**
 * Platzt der Tresor? Nur relevant, wenn **niemand** gestohlen hat: Wer den vollen
 * Tresor sieht und trotzdem teilt, bekommt das Feuerwerk (GDD §3.2).
 */
export function isJackpot(vault: number, spec: VaultSpec): boolean {
  return vault >= spec.jackpotAt;
}

/** Jackpot-Ausschuettung: jeder trinkt ⌈V / n⌉. */
export function jackpotSips(vault: number, playerCount: number): number {
  if (playerCount <= 0) throw new RangeError('jackpotSips braucht mindestens einen Spieler.');
  return Math.ceil(vault / playerCount);
}

/** Wachstum einer Friedensrunde, in der der Tresor **nicht** geplatzt ist. */
export function grownVault(vault: number, spec: VaultSpec): number {
  const grown = vault + spec.growth;
  return spec.capped ? Math.min(grown, spec.jackpotAt) : grown;
}

/**
 * Tresorstand fuer die naechste Runde.
 *
 * - Mindestens ein Dieb → Reset auf V_0.
 * - Jackpot → Reset auf V_0 (der Tresor ist ja geplatzt).
 * - Sonst → Wachstum, ggf. am Deckel gestoppt.
 */
export function nextVault(
  vault: number,
  opts: { thieves: number; jackpot: boolean },
  spec: VaultSpec
): number {
  if (opts.thieves > 0 || opts.jackpot) return spec.startVault;
  return grownVault(vault, spec);
}
