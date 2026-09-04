/**
 * Farb-Audit (Audit A2): Sind die acht Spielerfarben auf dem dunklen Samt
 * unterscheidbar — auch mit Rot-Grün-Schwäche?
 *
 * Simuliert Deuteranopie und Protanopie (Brettel/Viénot-Verfahren über LMS) und rechnet
 * für jedes Farbpaar den Abstand in CIE Lab (ΔE76). Unter der Schwelle liegende Paare
 * werden gemeldet — sie sind kein Fehler, sondern der Grund, warum jede Farbe zusätzlich
 * ein **Symbol** trägt (GDD §3.1). Das Skript hält fest, welche Paare sich allein auf
 * das Symbol verlassen.
 *
 * `npm run check:colors`
 */

const PLAYER_COLORS = [
  { id: 'red', hex: 0xff4757, symbol: 'circle' },
  { id: 'blue', hex: 0x3b82f6, symbol: 'triangle' },
  { id: 'green', hex: 0x2ed573, symbol: 'square' },
  { id: 'yellow', hex: 0xffd32a, symbol: 'star' },
  { id: 'purple', hex: 0xaf73ee, symbol: 'diamond' },
  { id: 'orange', hex: 0xff7f50, symbol: 'heart' },
  { id: 'pink', hex: 0xff6b9d, symbol: 'bolt' },
  { id: 'cyan', hex: 0x18dcff, symbol: 'cross' },
];

/** Samt-Hintergrund, auf dem die Crooks stehen (Art Direction §2). */
const VELVET = 0x5b1e3a;

/** Ab hier gelten zwei Farben als sicher unterscheidbar (JND liegt bei ~2,3). */
const DELTA_E_OK = 25;
/**
 * Mindestabstand zum Hintergrund, damit eine Figur überhaupt heraussticht.
 *
 * Bewusst kein hoher Wert: Jeder Crook trägt eine 10 px starke `ink`-Outline und einen
 * Schlagschatten. Die Silhouette trägt also auch dort, wo die Fläche dem Samt nahekommt —
 * die Farbe muss die Figur nicht allein vom Grund lösen, sie muss sie **benennen**.
 */
const DELTA_E_BG = 25;

const toRgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

const srgbToLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** sRGB → CIE Lab (D65). */
function toLab(rgb) {
  const [r, g, b] = rgb.map(srgbToLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/*
 * Farbfehlsichtigkeit nach Viénot/Brettel/Mollon: in den LMS-Raum, die fehlende
 * Zapfenachse aus den beiden anderen rekonstruieren, zurück.
 */
const RGB_TO_LMS = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
const LMS_TO_RGB = [
  [0.080944, -0.130504, 0.116721],
  [-0.0102485, 0.0540194, -0.113615],
  [-0.000365294, -0.00412163, 0.693513],
];
const SIMULATE = {
  deuteranopie: [
    [1, 0, 0],
    [0.494207, 0, 1.24827],
    [0, 0, 1],
  ],
  protanopie: [
    [0, 2.02344, -2.52581],
    [0, 1, 0],
    [0, 0, 1],
  ],
};

const apply = (matrix, v) => matrix.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

function simulate(rgb, kind) {
  const lms = apply(RGB_TO_LMS, rgb);
  const shifted = apply(SIMULATE[kind], lms);
  return apply(LMS_TO_RGB, shifted).map((v) => Math.max(0, Math.min(255, v)));
}

/* ------------------------------------------------------------------ */

/** Nur bei normalem Sehen ist ein enger Abstand ein Fehler. */
let failures = 0;
/** Bei simulierter Farbfehlsichtigkeit ist er ein Befund — festhalten, nicht abbrechen. */
const notes = [];
const relyOnSymbol = [];

for (const kind of ['normal', 'deuteranopie', 'protanopie']) {
  const view = (hex) => {
    const rgb = toRgb(hex);
    return toLab(kind === 'normal' ? rgb : simulate(rgb, kind));
  };

  console.log(`\n== ${kind} ==`);

  // 1. Jede Farbe muss sich vom Samt abheben.
  const background = view(VELVET);
  for (const color of PLAYER_COLORS) {
    const distance = deltaE(view(color.hex), background);
    if (distance >= DELTA_E_BG) continue;
    const line = `${color.id} hebt sich kaum vom Samt ab (ΔE ${distance.toFixed(1)})`;
    if (kind === 'normal') {
      console.error(`  ✗ ${line}`);
      failures++;
    } else {
      console.log(`  · ${line} — die ink-Outline trägt die Silhouette`);
      notes.push(`${line} (${kind})`);
    }
  }

  // 2. Farbpaare untereinander.
  const weak = [];
  for (let i = 0; i < PLAYER_COLORS.length; i++) {
    for (let j = i + 1; j < PLAYER_COLORS.length; j++) {
      const a = PLAYER_COLORS[i];
      const b = PLAYER_COLORS[j];
      const distance = deltaE(view(a.hex), view(b.hex));
      if (distance < DELTA_E_OK) weak.push({ a, b, distance });
    }
  }

  if (weak.length === 0) {
    console.log('  ✓ alle 28 Paare deutlich unterscheidbar');
  } else {
    for (const { a, b, distance } of weak) {
      console.log(
        `  · ${a.id}/${b.id}: ΔE ${distance.toFixed(1)} — getrennt über die Symbole ` +
          `${a.symbol}/${b.symbol}`
      );
      if (kind !== 'normal') relyOnSymbol.push(`${a.id}/${b.id} (${kind})`);
      // Bei normalem Sehen wäre ein enges Paar ein echter Fehler.
      if (kind === 'normal') failures++;
    }
  }
}

console.log('\n----------------------------------------------------------');
if (notes.length > 0) {
  console.log(`Knappe Abstände zum Hintergrund bei Farbfehlsichtigkeit (${notes.length}):`);
  for (const note of notes) console.log(`  ${note}`);
}
if (relyOnSymbol.length > 0) {
  console.log(`Paare, die bei Farbfehlsichtigkeit auf das Symbol angewiesen sind (${relyOnSymbol.length}):`);
  for (const pair of relyOnSymbol) console.log(`  ${pair}`);
  console.log('Das ist erwartet — GDD §3.1 verlangt das Symbol genau deshalb.');
} else {
  console.log('Alle Farbpaare bleiben auch mit Rot-Grün-Schwäche unterscheidbar.');
}

if (failures > 0) {
  console.error(`\n${failures} Problem(e) bei normalem Sehen — das ist ein Fehler.`);
  process.exitCode = 1;
} else {
  console.log('\nOK: Bei normalem Sehen ist alles unterscheidbar.');
}
