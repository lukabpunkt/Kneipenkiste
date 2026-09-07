#!/usr/bin/env node
/**
 * Lighthouse-Gate (Audit A5: Perf / A11y / Best Practices ≥ 90).
 *
 * Läuft gegen die gebaute App auf dem Preview-Server. Bewusst ein eigenes Skript und
 * kein CI-Schritt aus drei Zeilen: Die Schwellen stehen dann an **einer** Stelle, und
 * `npm run check:lighthouse` misst lokal dasselbe wie die CI.
 */

import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';

const URL = process.env.LH_URL ?? 'http://127.0.0.1:4173/Zoll/';
const REPORT = '/tmp/zoll-lighthouse.json';

/** Die Grenzen aus dem A5-Audit. */
const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
};

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function main() {
  await rm(REPORT, { force: true });

  const code = await run('npx', [
    'lighthouse',
    URL,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox',
    `--only-categories=${Object.keys(THRESHOLDS).join(',')}`,
    '--form-factor=mobile',
    '--screenEmulation.mobile',
    '--output=json',
    `--output-path=${REPORT}`,
  ]);

  if (code !== 0) {
    console.error(`check:lighthouse — Lighthouse brach ab (Exit ${code}). Läuft der Preview-Server auf ${URL}?`);
    process.exitCode = 1;
    return;
  }

  const report = JSON.parse(await readFile(REPORT, 'utf8'));
  let failed = 0;

  for (const [id, min] of Object.entries(THRESHOLDS)) {
    const score = Math.round((report.categories[id]?.score ?? 0) * 100);
    const ok = score >= min;
    if (!ok) failed += 1;
    console.log(`  ${id.padEnd(16)} ${String(score).padStart(3)}  ${ok ? `ok (≥ ${min})` : `ZU WENIG (< ${min})`}`);
  }

  if (failed > 0) {
    console.error(`\ncheck:lighthouse — ${failed} Kategorie(n) unter der Grenze (Audit A5).`);
    process.exitCode = 1;
  } else {
    console.log('\ncheck:lighthouse — alle Kategorien bestehen.');
  }
}

await main();
