/**
 * Die Bühne meldet ihre Messwerte an — und beim Abräumen wieder ab.
 *
 * Zwei Leser: das Dev-Panel (`?dev=1`) und `perf.spec.ts`. Der Test kann den Bühnen-Chunk
 * nicht importieren, weil sein Dateiname einen Build-Hash trägt; statt den zu raten,
 * hängt sich die Bühne hier selbst ein.
 *
 * Warum in `game/` und nicht in `dev/`: Es ist die Bühne, die etwas über sich sagt. Läge
 * die Funktion beim Werkzeug, müsste ein Screen aus `dev/` importieren — und dann steht
 * der Dev-Zweig im Produktionsbündel, obwohl ihn dort niemand aufruft.
 */

export interface StageStats {
  frameTimes: readonly number[];
  workTimes: readonly number[];
  drawCalls: number;
}

type StatsSource = () => StageStats | undefined;

interface StatsGlobal {
  __stageStats?: StatsSource;
}

export function publishStageStats(stats: StatsSource | undefined): void {
  const target = globalThis as unknown as StatsGlobal;
  if (stats) target.__stageStats = stats;
  else delete target.__stageStats;
}
