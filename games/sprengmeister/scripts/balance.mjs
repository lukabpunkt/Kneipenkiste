/**
 * Balancing-Panel als Skript (Roadmap M6.2, Audit A6).
 *
 * Vor dem Playtest soll auf dem Tisch liegen, was die Simulation über das Spiel weiß:
 * Wie lang ist eine Runde, wie oft knallt es, wie oft passiert der Preis der Gier — und
 * zwar für jede Spielerzahl und jede Modus-Kombination, die tatsächlich vorkommt.
 *
 * ## Warum ein Skript und kein Dev-Panel
 *
 * Die Roadmap nennt ein „Simulations-Panel". Ein Panel zeigt eine Zahl, während man
 * daneben steht; für einen Balancing-Pass braucht man aber **alle** Zahlen nebeneinander,
 * reproduzierbar und in einer Form, die man in ein Dokument kleben kann. Deshalb eine
 * Tabelle auf der Konsole — und derselbe Seed liefert dieselben Zeilen.
 *
 * Gemessen wird mit der **Hinweis-Strategie**: So spielt ein aufmerksamer Tisch, und die
 * Zielwerte aus Audit A6 sind gegen diesen Fall gemeint. Blindes Graben steht als
 * Obergrenze daneben, denn so lange dauert eine Runde im schlimmsten Fall.
 *
 *   node scripts/balance.mjs [runden]
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Die Kernlogik liegt in TypeScript. Statt sie zu übersetzen, wird sie über Vites
 * Node-Runner geladen — dieselbe Auflösung von `@/…` wie im Spiel und in den Tests.
 */
async function loadCore() {
  const { createServer } = await import('vite');
  const server = await createServer({
    configFile: require.resolve('../vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
    /*
     * Ohne das scannt Vite beim Start alle Einstiegspunkte nach Abhaengigkeiten — also
     * auch die PIXI-Seite, die hier niemand braucht — und meldet dabei Aufloesungsfehler
     * fuer Dateien, die im SSR-Lauf gar nicht vorkommen. Geladen werden ohnehin nur die
     * drei Module aus `core/` und `config/`.
     */
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const simulate = await server.ssrLoadModule('/src/core/simulate.ts');
  const rules = await server.ssrLoadModule('/src/config/rules.ts');
  const rng = await server.ssrLoadModule('/src/core/rng.ts');
  return { simulate, rules, rng, close: () => server.close() };
}

/** Die Modus-Kombinationen, die ein Tisch wirklich einstellt. */
const SCENARIOS = [
  { label: 'Standard', modes: {} },
  { label: 'Doppelagent', modes: { doubleAgent: true } },
  { label: 'Kettenreaktion', modes: { chainReaction: true } },
  { label: 'Zwei Kisten', modes: { twoChests: true } },
  { label: 'Nachtgräber', modes: { nightDigger: true } },
  { label: 'Doppelagent + Kette', modes: { doubleAgent: true, chainReaction: true } },
  { label: 'Nacht + Zwei Kisten', modes: { nightDigger: true, twoChests: true } },
  { label: 'Alles an', modes: { doubleAgent: true, chainReaction: true, twoChests: true, nightDigger: true, masterBonus: true } },
];

const PLAYER_COUNTS = [3, 4, 6, 8];

/** Zielwerte aus Audit A6. */
const TARGET = { digsMin: 4, digsMax: 8, blastsMin: 1, blastsMax: 3, greedMin: 0.05, greedMax: 0.15 };

function mark(value, min, max) {
  return value >= min && value <= max ? ' ' : '!';
}

async function main() {
  const rounds = Number(process.argv[2] ?? 2000);
  const { simulate, rules, rng, close } = await loadCore();

  console.log(`\nSprengmeister — Balancing über je ${rounds} Runden`);
  console.log(`Ziel (Audit A6): Grabungen 4–8 im Median · Explosionen 1–3 · Preis der Gier 5–15 %\n`);
  console.log('Szenario              Spieler  Feld  Grabungen (Median)   Explosionen  Gier    Blind');
  console.log('─'.repeat(92));

  const offenders = [];

  for (const scenario of SCENARIOS) {
    for (const playerCount of PLAYER_COUNTS) {
      const modes = { ...rules.DEFAULT_MODES, ...scenario.modes };
      const playerIds = Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);

      const collect = (strategy) => {
        const list = [];
        for (let i = 0; i < rounds; i++) {
          const generator = rng.createSeededRng(i * 7919 + playerCount);
          list.push(
            simulate.simulateRound({
              playerIds,
              modes,
              rnd: { int: (max) => generator.int(max) },
              seed: i,
              strategy,
            })
          );
        }
        return simulate.summarise(list);
      };

      const hints = collect('hints');
      const blind = collect('random');
      const size = rules.boardSizeFor(playerCount);

      const digFlag = mark(hints.digsMedian, TARGET.digsMin, TARGET.digsMax);
      const blastFlag = mark(hints.blastsMean, TARGET.blastsMin, TARGET.blastsMax);
      const greedFlag = mark(hints.greedRate, TARGET.greedMin, TARGET.greedMax);
      if (digFlag + blastFlag + greedFlag !== '   ') {
        offenders.push({ scenario: scenario.label, playerCount, hints, digFlag, blastFlag, greedFlag });
      }

      console.log(
        `${scenario.label.padEnd(21)} ${String(playerCount).padStart(4)}   ${size}×${size}  ` +
          `${String(hints.digsMedian).padStart(6)}${digFlag} (${hints.digsMin}–${hints.digsMax})`.padEnd(21) +
          `${hints.blastsMean.toFixed(2).padStart(9)}${blastFlag}   ` +
          `${(hints.greedRate * 100).toFixed(1).padStart(5)}%${greedFlag} ` +
          `${String(blind.digsMedian).padStart(6)}`
      );

      if (hints.unfinished > 0) {
        console.log(`   ⚠ ${hints.unfinished} Runden ohne Kistenfund — das darf nie passieren.`);
      }
    }
    console.log('');
  }

  if (offenders.length === 0) {
    console.log('Alle Szenarien liegen in den Zielspannen aus Audit A6.\n');
  } else {
    console.log(`${offenders.length} Zeilen ausserhalb der Zielspannen (mit ! markiert).\n`);
  }

  await close();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
