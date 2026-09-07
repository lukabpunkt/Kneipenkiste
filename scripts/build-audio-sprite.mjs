#!/usr/bin/env node
/**
 * Audio-Sprite (GDD §6).
 *
 * Quellen: `audio-src/*.wav|mp3|ogg` — ein Clip je Sprite-Key.
 * Ziel:    `public/audio/sprite.{ogg,m4a}` + `public/audio/sprite.json` (howler-Format)
 *
 * Ein Sprite statt 28 Dateien: iOS entsperrt Audio nur bei einer Nutzergeste, und ein
 * einziges Element lässt sich zuverlässig entsperren (wie in den Schwesterspielen).
 * Die Clips werden in Quellenreihenfolge aneinandergehängt, getrennt durch Stille,
 * damit ein zu früh gestoppter Clip nicht in den nächsten läuft.
 *
 * Die Clips entstehen in M3 (Roadmap M3.5). Bis dahin meldet das Skript nur, was fehlt.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const SRC_DIR = 'audio-src';
const OUT_DIR = 'public/audio';
/** Stille zwischen zwei Clips, damit sie sich nicht überlappen. */
const GAP_MS = 250;

/** Die Keys aus GDD §6 — der Vollständigkeits-Check meldet, was noch fehlt. */
const EXPECTED = [
  'ui_tap', 'ui_confirm', 'pass_whoosh', 'plank_select', 'seal',
  'wind_loop', 'vulture_screech', 'vulture_laugh',
  'footsteps_run', 'step_thud',
  'creak_1', 'creak_2', 'creak_3', 'creak_4', 'rope_strain',
  'plank_snap', 'plank_crumble', 'whistle_fall', 'splash', 'rock_squash',
  'hat_flutter', 'relief_exhale', 'balloon_deflate',
  'hammer_rhythm', 'wood_rot', 'stamp', 'drum_deathzone',
  'crowd_gasp', 'crowd_laugh',
  'music_lobby', 'music_negotiation', 'music_step',
];

async function ffmpegAvailable() {
  try {
    await run('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

/** Länge eines Clips in Millisekunden. */
async function durationMs(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return Math.round(parseFloat(stdout.trim()) * 1000);
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.log(`build:audio — ${SRC_DIR}/ gibt es noch nicht (Roadmap M3.5).`);
    return;
  }

  const files = (await readdir(SRC_DIR))
    .filter((f) => /\.(wav|mp3|ogg|m4a)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.log(`build:audio — keine Clips in ${SRC_DIR}/. Erwartet werden ${EXPECTED.length} Keys (GDD §6).`);
    return;
  }

  if (!(await ffmpegAvailable())) {
    console.error('build:audio — ffmpeg/ffprobe nicht gefunden. `brew install ffmpeg`.');
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  /* Sprite-Karte aufbauen: Offset und Länge je Key, in Quellenreihenfolge. */
  const sprite = {};
  const inputs = [];
  let cursor = 0;

  for (const file of files) {
    const full = path.join(SRC_DIR, file);
    const key = file.replace(/\.[^.]+$/, '');
    const length = await durationMs(full);

    sprite[key] = [cursor, length, key.startsWith('music_') || key.endsWith('_loop')];
    cursor += length + GAP_MS;
    inputs.push(full);
  }

  /* Concat über einen Filtergraph: keine Zwischendateien, gleiche Sample-Rate für alle. */
  const filter = inputs
    .map((_, i) => `[${i}:a]aresample=48000,apad=pad_dur=${GAP_MS / 1000}[a${i}]`)
    .join(';');
  const chain = inputs.map((_, i) => `[a${i}]`).join('');

  for (const [ext, codec] of [['ogg', 'libvorbis'], ['m4a', 'aac']]) {
    await run('ffmpeg', [
      '-y',
      ...inputs.flatMap((file) => ['-i', file]),
      '-filter_complex', `${filter};${chain}concat=n=${inputs.length}:v=0:a=1[out]`,
      '-map', '[out]',
      '-c:a', codec,
      path.join(OUT_DIR, `sprite.${ext}`),
    ]);
  }

  await writeFile(path.join(OUT_DIR, 'sprite.json'), `${JSON.stringify({ sprite }, null, 2)}\n`);

  const missing = EXPECTED.filter((key) => !(key in sprite));
  console.log(`build:audio — ${files.length} Clips, ${cursor} ms.`);
  if (missing.length > 0) console.log(`  Es fehlen noch: ${missing.join(', ')}`);
}

await main();
