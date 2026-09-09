/**
 * Minimaler PNG-Dekoder — genau so viel, wie Playwright-Screenshots brauchen.
 *
 * Warum selbst geschrieben: Auf dieser Maschine gibt es kein ffmpeg und kein ImageMagick
 * (siehe ADR-20), und eine Bildbibliothek als Abhängigkeit für **ein** README-Bild wäre
 * das falsche Tauschgeschäft. Playwright liefert immer denselben Fall: 8 Bit pro Kanal,
 * Truecolor mit oder ohne Alpha, nicht interlaced. Alles andere wirft hier absichtlich,
 * statt still etwas Falsches zu liefern.
 */

import { inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Bytes pro Pixel je Farbtyp (nur die beiden, die vorkommen). */
const CHANNELS = { 2: 3, 6: 4 };

/** Paeth-Prädiktor aus der PNG-Spezifikation. */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Dekodiert eine PNG-Datei zu `{ width, height, data }` mit `data` als RGBA-Bytefolge.
 */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('Kein PNG.');

  let offset = 8;
  let header;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;

    if (type === 'IHDR') {
      header = {
        width: buffer.readUInt32BE(start),
        height: buffer.readUInt32BE(start + 4),
        depth: buffer[start + 8],
        colorType: buffer[start + 9],
        interlace: buffer[start + 12],
      };
    } else if (type === 'IDAT') {
      idat.push(buffer.subarray(start, start + length));
    } else if (type === 'IEND') {
      break;
    }

    /* 4 Bytes Länge + 4 Typ + Daten + 4 CRC. Die CRC prüfen wir nicht — wir haben die
       Datei selbst eine Sekunde vorher geschrieben. */
    offset = start + length + 4;
  }

  if (!header) throw new Error('IHDR fehlt.');
  if (header.depth !== 8) throw new Error(`Nur 8 Bit, nicht ${header.depth}.`);
  if (header.interlace !== 0) throw new Error('Interlaced PNG wird nicht unterstuetzt.');

  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`Farbtyp ${header.colorType} wird nicht unterstuetzt.`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);

  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));

    /* Filter rückwärts anwenden — links (a), oben (b), links-oben (c). */
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = previous[i];
      const c = i >= channels ? previous[i - channels] : 0;

      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[i] = (line[i] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`Unbekannter Filter ${filter}.`);
    }

    for (let x = 0; x < width; x += 1) {
      const target = (y * width + x) * 4;
      const source = x * channels;
      out[target] = line[source];
      out[target + 1] = line[source + 1];
      out[target + 2] = line[source + 2];
      out[target + 3] = channels === 4 ? line[source + 3] : 0xff;
    }

    previous = line;
  }

  return { width, height, data: out };
}

/**
 * Verkleinert ein RGBA-Bild um einen ganzzahligen Faktor (Box-Mittelung).
 *
 * Ganzzahlig, weil das die einzige Skalierung ist, die ohne Interpolationsartefakte
 * auskommt — und Artefakte kosten in einem GIF sofort Farben aus der Palette.
 */
export function downscale(image, factor) {
  if (factor === 1) return image;

  const width = Math.floor(image.width / factor);
  const height = Math.floor(image.height / factor);
  const out = Buffer.alloc(width * height * 4);
  const samples = factor * factor;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const source = ((y * factor + dy) * image.width + (x * factor + dx)) * 4;
          r += image.data[source];
          g += image.data[source + 1];
          b += image.data[source + 2];
          a += image.data[source + 3];
        }
      }

      const target = (y * width + x) * 4;
      out[target] = Math.round(r / samples);
      out[target + 1] = Math.round(g / samples);
      out[target + 2] = Math.round(b / samples);
      out[target + 3] = Math.round(a / samples);
    }
  }

  return { width, height, data: out };
}
