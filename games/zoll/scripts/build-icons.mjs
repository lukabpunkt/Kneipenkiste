/**
 * Baut die PWA-Icons aus `assets-src/svg/app-icon.svg`.
 *
 * `npm run build:icons` — muss nur laufen, wenn sich das Icon aendert; die Ergebnisse
 * liegen versioniert in `public/icons/`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = resolve(root, 'assets-src/svg/app-icon.svg');
const outDir = resolve(root, 'public/icons');

/**
 * Maskable-Icons brauchen 20 % Rand ("safe zone"), sonst schneidet Android das
 * Griffrad an. Deshalb wird das Motiv kleiner gerendert und auf dem Bg zentriert.
 */
const MASKABLE_PADDING = 0.2;

const TARGETS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

await mkdir(outDir, { recursive: true });

for (const target of TARGETS) {
  const inner = target.maskable ? Math.round(target.size * (1 - MASKABLE_PADDING * 2)) : target.size;
  const pad = Math.round((target.size - inner) / 2);

  const motif = await sharp(source, { density: 384 }).resize(inner, inner).png().toBuffer();

  const image = target.maskable
    ? sharp({
        create: {
          width: target.size,
          height: target.size,
          channels: 4,
          background: '#0F0E1A',
        },
      }).composite([{ input: motif, top: pad, left: pad }])
    : sharp(motif);

  await writeFile(resolve(outDir, target.file), await image.png({ compressionLevel: 9 }).toBuffer());
  console.log(`  ✓ ${target.file} (${target.size}px${target.maskable ? ', maskable' : ''})`);
}

// Das SVG dient zugleich als Favicon — eine Quelle, kein Nachpflegen.
const { readFile } = await import('node:fs/promises');
await writeFile(resolve(outDir, 'favicon.svg'), await readFile(source));
console.log('  ✓ favicon.svg');
