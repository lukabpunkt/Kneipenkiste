/**
 * GIF89a-Encoder — so klein, wie ein animiertes README-Bild es erlaubt.
 *
 * Kein ffmpeg, kein ImageMagick, keine Bildbibliothek (siehe ADR-20 zur gleichen Lage
 * beim Ton). Das Format ist alt und gut dokumentiert, und der Inhalt kommt uns entgegen:
 * Cartoon-Flächen mit wenigen Farben lassen sich mit einer gemeinsamen Palette und ohne
 * Dithering sauber quantisieren.
 *
 * Was hier **nicht** drin ist: lokale Paletten, Interlacing, Transparenz-Optimierung,
 * Differenz-Frames. Das kostet Bytes und wäre für einen Zehn-Sekunden-Loop das falsche
 * Ende der Waage.
 */

/**
 * Baut eine gemeinsame Palette aus allen Frames.
 *
 * Kein Median-Cut: Die Bühne benutzt eine gezeichnete Palette, nicht ein Foto. Ein
 * Histogramm über leicht gerundete Farben findet die tatsächlich vorkommenden Töne, und
 * die häufigsten 256 sind praktisch das ganze Bild. Ein Farbwürfel würde stattdessen
 * Zwischentöne mitschleppen, die nie vorkommen.
 */
function buildPalette(frames, maxColors = 256) {
  const counts = new Map();

  for (const frame of frames) {
    for (let i = 0; i < frame.data.length; i += 4) {
      /* Auf 5 Bit je Kanal runden: Verläufe im Himmel fallen sonst allein über 3000
         Farbnuancen in die Palette und verdrängen die Figuren. */
      const key =
        ((frame.data[i] >> 3) << 10) | ((frame.data[i + 1] >> 3) << 5) | (frame.data[i + 2] >> 3);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([key]) => [((key >> 10) & 31) << 3, ((key >> 5) & 31) << 3, (key & 31) << 3]);

  /* Die Palette muss eine Zweierpotenz sein — der Rest bleibt schwarz und unbenutzt. */
  const size = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, top.length))));
  while (top.length < size) top.push([0, 0, 0]);
  return top;
}

/** Nächster Palettenindex, mit Cache — dieselbe Farbe kommt in einem Frame tausendfach. */
function createMapper(palette) {
  const cache = new Map();

  return (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;

    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const dr = r - palette[i][0];
      const dg = g - palette[i][1];
      const db = b - palette[i][2];
      /* Gewichtet nach Helligkeitsempfinden — Grün trägt am meisten. */
      const distance = dr * dr * 3 + dg * dg * 6 + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }

    cache.set(key, best);
    return best;
  };
}

/** Sammelt Bytes und schreibt LZW-Codes bitweise hinein. */
function createBitWriter() {
  const bytes = [];
  let current = 0;
  let bits = 0;

  return {
    write(code, size) {
      current |= code << bits;
      bits += size;
      while (bits >= 8) {
        bytes.push(current & 0xff);
        current >>= 8;
        bits -= 8;
      }
    },
    flush() {
      if (bits > 0) bytes.push(current & 0xff);
      current = 0;
      bits = 0;
      return bytes;
    },
  };
}

/**
 * LZW nach GIF-Variante: Clear-Code, EOI, wachsende Codelänge, Reset bei 4096.
 *
 * Das Wörterbuch liegt als `Map` von `"präfix,farbe"` — langsamer als ein Trie, aber für
 * ein Skript, das ein Bild pro Release erzeugt, völlig ausreichend und nachlesbar.
 */
function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const writer = createBitWriter();
  let dictionary = new Map();
  let next = endCode + 1;
  let codeSize = minCodeSize + 1;

  writer.write(clearCode, codeSize);

  let prefix = indices[0];

  for (let i = 1; i < indices.length; i += 1) {
    const value = indices[i];
    const key = `${prefix},${value}`;
    const existing = dictionary.get(key);

    if (existing !== undefined) {
      prefix = existing;
      continue;
    }

    writer.write(prefix, codeSize);
    dictionary.set(key, next);
    next += 1;

    if (next > 1 << codeSize) {
      if (codeSize < 12) {
        codeSize += 1;
      } else {
        /* Wörterbuch voll: löschen und von vorn. */
        writer.write(clearCode, codeSize);
        dictionary = new Map();
        next = endCode + 1;
        codeSize = minCodeSize + 1;
      }
    }

    prefix = value;
  }

  writer.write(prefix, codeSize);
  writer.write(endCode, codeSize);
  return writer.flush();
}

/** GIF-Datenblöcke: höchstens 255 Bytes je Block, terminiert von einer 0. */
function subBlocks(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
  return out;
}

function uint16(value) {
  return [value & 0xff, (value >> 8) & 0xff];
}

/**
 * Baut das GIF.
 *
 * `frames` sind `{ width, height, data }` mit RGBA-Bytes (alle gleich groß),
 * `delayMs` die Anzeigedauer je Frame. GIF rechnet in Hundertstelsekunden — Werte unter
 * 20 ms behandeln Browser unterschiedlich, deshalb ist 50 ms (20 fps) die sinnvolle
 * Untergrenze.
 */
export function encodeGif(frames, { delayMs = 100, loop = 0, maxColors = 256 } = {}) {
  if (frames.length === 0) throw new Error('Keine Frames.');

  const { width, height } = frames[0];
  const palette = buildPalette(frames, maxColors);
  const mapColor = createMapper(palette);
  const bits = Math.log2(palette.length);
  const minCodeSize = Math.max(2, bits);

  const bytes = [];
  bytes.push(...Buffer.from('GIF89a', 'ascii'));

  /* Logical Screen Descriptor: globale Palette, Auflösung 8 Bit, Größe 2^(bits). */
  bytes.push(...uint16(width), ...uint16(height));
  bytes.push(0x80 | (7 << 4) | (bits - 1), 0, 0);
  for (const [r, g, b] of palette) bytes.push(r, g, b);

  /* Netscape-Erweiterung — ohne sie läuft der Loop nur einmal. */
  bytes.push(0x21, 0xff, 0x0b);
  bytes.push(...Buffer.from('NETSCAPE2.0', 'ascii'));
  bytes.push(0x03, 0x01, ...uint16(loop), 0x00);

  const delay = Math.max(2, Math.round(delayMs / 10));

  for (const frame of frames) {
    /* Graphic Control Extension: Verzögerung, keine Transparenz, nicht zurücksetzen. */
    bytes.push(0x21, 0xf9, 0x04, 0x00, ...uint16(delay), 0x00, 0x00);

    /* Image Descriptor: volles Bild, keine lokale Palette. */
    bytes.push(0x2c, ...uint16(0), ...uint16(0), ...uint16(width), ...uint16(height), 0x00);

    const indices = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < frame.data.length; i += 4, p += 1) {
      indices[p] = mapColor(frame.data[i], frame.data[i + 1], frame.data[i + 2]);
    }

    bytes.push(minCodeSize);
    bytes.push(...subBlocks(lzwEncode(indices, minCodeSize)));
  }

  bytes.push(0x3b);
  return Buffer.from(bytes);
}
