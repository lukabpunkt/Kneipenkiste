#!/usr/bin/env node
/**
 * Audio-Sprite (GDD §6, Architektur §1).
 *
 * Quellen: `audio-src/*.wav` — ein Clip je Sprite-Key (erzeugt von `synth-audio.mjs`
 * oder später von Hand aufgenommen).
 * Ziel:    `public/audio/sprite.m4a` + `sprite.json` (howler-Format).
 *
 * **Ein** Sprite statt 32 Dateien: iOS gibt Audio erst nach einer Nutzergeste frei, und
 * ein einziges Element lässt sich zuverlässig entsperren. 32 Elemente einzeln zu
 * entsperren ist ein Rennen, das man auf manchen Geräten verliert.
 *
 * Kein ffmpeg: Die WAVs haben alle dasselbe Format, also ist das Aneinanderhängen reine
 * Puffer-Arbeit. Komprimiert wird mit `afconvert` (auf jedem Mac vorhanden). Fehlt es,
 * bleibt es beim WAV — die Datei ist dann grösser, das Spiel läuft trotzdem.
 *
 * Aufruf: `npm run build:audio`
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const SRC_DIR = 'audio-src';
const OUT_DIR = 'public/audio';
/** Stille zwischen zwei Clips, damit ein zu früh gestoppter nicht in den nächsten läuft. */
const GAP_MS = 120;

/** Diese Keys laufen in Schleife (Musik, Wind) — howler braucht das im Sprite-Eintrag. */
const LOOPING = /^(music_|wind_)/;

function parseWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') throw new Error('Kein RIFF/WAV.');

  /* Chunks durchgehen statt feste Offsets: Manche Encoder schieben `LIST` dazwischen. */
  let offset = 12;
  let format;
  let data;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = buffer.subarray(offset + 8, offset + 8 + size);
    if (id === 'fmt ') {
      format = {
        channels: body.readUInt16LE(2),
        rate: body.readUInt32LE(4),
        bits: body.readUInt16LE(14),
      };
    } else if (id === 'data') {
      data = body;
    }
    offset += 8 + size + (size % 2);
  }

  if (!format || !data) throw new Error('WAV ohne fmt- oder data-Chunk.');
  return { format, data };
}

function writeWav({ channels, rate, bits }, data) {
  const header = Buffer.alloc(44);
  const byteRate = (rate * channels * bits) / 8;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.log(`build:audio — ${SRC_DIR}/ gibt es nicht. Erst \`npm run synth:audio\`.`);
    return;
  }

  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.wav')).sort();
  if (files.length === 0) {
    console.log(`build:audio — keine Clips in ${SRC_DIR}/.`);
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  const chunks = [];
  const sprite = {};
  let format;
  let cursorMs = 0;

  for (const file of files) {
    const parsed = parseWav(await readFile(path.join(SRC_DIR, file)));
    format ??= parsed.format;

    if (
      parsed.format.rate !== format.rate ||
      parsed.format.channels !== format.channels ||
      parsed.format.bits !== format.bits
    ) {
      throw new Error(`${file} hat ein anderes Format — alle Clips müssen gleich sein.`);
    }

    const key = file.replace(/\.wav$/, '');
    const bytesPerMs = (format.rate * format.channels * format.bits) / 8 / 1000;
    const lengthMs = Math.round(parsed.data.length / bytesPerMs);

    sprite[key] = [cursorMs, lengthMs, LOOPING.test(key)];
    chunks.push(parsed.data);

    /* Stille dazwischen — als Puffer, nicht als Pause im Klang. */
    chunks.push(Buffer.alloc(Math.round(GAP_MS * bytesPerMs)));
    cursorMs += lengthMs + GAP_MS;
  }

  const wav = writeWav(format, Buffer.concat(chunks));
  const wavPath = path.join(OUT_DIR, 'sprite.wav');
  await writeFile(wavPath, wav);

  /*
   * `afconvert` gibt es auf jedem Mac. Auf einem Rechner ohne bleibt die WAV liegen —
   * grösser, aber spielbar. Die Assets werden ohnehin eingecheckt wie die Atlanten, also
   * läuft dieser Schritt einmal auf meiner Maschine, nicht in CI.
   */
  let encoded = false;
  try {
    await run('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wavPath, path.join(OUT_DIR, 'sprite.m4a')]);
    encoded = true;
    await rm(wavPath);
  } catch {
    console.warn('build:audio — afconvert nicht gefunden, es bleibt bei sprite.wav.');
  }

  await writeFile(
    path.join(OUT_DIR, 'sprite.json'),
    `${JSON.stringify({ format: encoded ? ['m4a'] : ['wav'], sprite }, null, 2)}\n`
  );

  const bytes = encoded
    ? (await readFile(path.join(OUT_DIR, 'sprite.m4a'))).length
    : wav.length;
  console.log(
    `build:audio — ${files.length} Clips, ${(cursorMs / 1000).toFixed(1)} s, ` +
      `${(bytes / 1024).toFixed(0)} KB (${encoded ? 'm4a' : 'wav'}).`
  );
}

await main();
