/**
 * Baut `public/icons/*.png` aus `assets-src/svg/favicon.svg` (Roadmap M0.7).
 * Das SVG bleibt die Quelle; die PNGs sind Build-Artefakte fuer Manifest und iOS.
 *
 * Aufruf: `npm run build:icons`
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'assets-src/svg/favicon.svg');
const outDir = resolve(root, 'public/icons');

/** Hintergrund der maskierbaren Variante (Art Direction §2: `bg.deep`). */
const BG = '#0F0E1A';

/**
 * `maskable` braucht ~20 % Rand, damit Android das Icon rund oder als Squircle
 * beschneiden kann, ohne die Lunte abzuschneiden.
 */
const MASKABLE_PADDING = 0.2;

const TARGETS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

await mkdir(outDir, { recursive: true });
const svg = await readFile(source);

for (const target of TARGETS) {
  const inner = target.maskable ? Math.round(target.size * (1 - 2 * MASKABLE_PADDING)) : target.size;
  const pad = Math.round((target.size - inner) / 2);

  const rendered = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();

  const image = target.maskable
    ? sharp({
        create: {
          width: target.size,
          height: target.size,
          channels: 4,
          background: BG,
        },
      }).composite([{ input: rendered, top: pad, left: pad }])
    : sharp(rendered);

  const out = resolve(outDir, target.file);
  await writeFile(out, await image.png({ compressionLevel: 9 }).toBuffer());
  console.log(`✓ ${target.file} (${target.size}×${target.size})`);
}

await copyFile(source, resolve(outDir, 'favicon.svg'));
console.log('✓ favicon.svg');
