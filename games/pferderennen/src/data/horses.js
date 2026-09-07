/**
 * The six horses — purely cosmetic data.
 *
 * IMPORTANT: there is deliberately not a single value here that influences the race. No speed,
 * stamina or luck stats. The engine does not even know this file exists (ESLint enforces that);
 * it works with runner indices 0..5, and only rendering maps index -> horse.
 * See docs/01_GAME_DESIGN.md §2 and docs/03_RACE_ENGINE.md §2.
 *
 * This file is the SINGLE SOURCE of the six signature colours, and they are the Kneipenkiste
 * player colours — the same six hexes Drinkshot, Sprengmeister, Tresor and Zoll hand out, so a
 * purple horse is exactly the purple a purple player is. Do not drift them.
 *
 * Nothing else holds a copy. render/trackTheme.js keeps its own palette because canvas cannot
 * read custom properties, but that palette is the scene, not the horses; the horses reach the
 * canvas through render/palette.js.
 */

/**
 * @typedef {object} Horse
 * @property {string} id            Stable key, used for bets and statistics.
 * @property {number} number        Starting number 1-6, shown on the gate and the saddle cloth.
 * @property {string} name          Display name.
 * @property {string} color         Signature colour (saddle, silks, gate, chips, confetti).
 * @property {string} colorLight    Highlight and glow tone.
 * @property {string} colorDark     Outline and shadow tone.
 * @property {string} coat          Coat colour of the body.
 * @property {string} coatDark      Darker coat colour for outlines and shading.
 * @property {string} mane          Colour of mane and tail.
 * @property {string} accessory     Key of the accessory drawn by render/horse.js.
 * @property {string} character     One line of character for the betting card.
 * @property {string[]} commentary  Commentary lines specific to this horse.
 */

/** @type {Horse[]} */
export const HORSES = [
  {
    id: 'trabsalot',
    number: 1,
    name: 'Sir Trabsalot',
    color: '#AF73EE',
    colorLight: '#D3AFEB',
    colorDark: '#7B3FBF',
    coat: '#3A3340',
    coatDark: '#221D26',
    mane: '#15121A',
    accessory: 'knightHelmet',
    character: 'Edel, hochnäsig, hält sich für Adel.',
    commentary: [
      'Sir Trabsalot galoppiert, als hätte er einen Stock verschluckt – einen sehr teuren.',
      'Sir Trabsalot lässt die anderen wissen, dass er hier eigentlich zu gut für ist.',
      'Adel verpflichtet – Sir Trabsalot verpflichtet sich zu mehr Tempo.',
      'Die Blesse blitzt, das Näschen rümpft sich: Sir Trabsalot zieht an.',
      'Sir Trabsalot würde ja gerne siegen, aber schwitzen ist so unfein.',
      'Ein Rennpferd mit Stammbaum – und mit der Traboptik eines Butlers.',
    ],
  },
  {
    id: 'prosecco',
    number: 2,
    name: 'Prosecco Rakete',
    color: '#FF6B9D',
    colorLight: '#FFAABE',
    colorDark: '#C94A78',
    coat: '#FFF1F6',
    coatDark: '#E8C3D4',
    mane: '#F9A8D4',
    accessory: 'sunglasses',
    character: 'Party-Pferd, laut, immer gut drauf.',
    commentary: [
      'Prosecco Rakete zündet die zweite Stufe – oder war das nur ein Rülpser?',
      'Prosecco Rakete rennt, als wäre die Happy Hour gleich vorbei.',
      'Glitzer in der Mähne, Blubbern im Kopf: Prosecco Rakete kommt.',
      'Prosecco Rakete winkt ins Publikum. Mitten im Rennen. Natürlich.',
      'Die Sonnenbrille sitzt, der Rest wird sich schon ergeben.',
      'Prosecco Rakete perlt am Feld vorbei.',
    ],
  },
  {
    id: 'morgana',
    number: 3,
    name: 'Kater Morgana',
    color: '#FF4757',
    colorLight: '#FF9798',
    colorDark: '#C0392B',
    coat: '#A9603A',
    coatDark: '#6E3A21',
    mane: '#4A2717',
    accessory: 'coffeeMug',
    character: 'Verkatert, unberechenbar, mal Turbo, mal Koma.',
    commentary: [
      'Kater Morgana hat gestern definitiv das Falsche gemischt.',
      'Kater Morgana läuft mit halb geschlossenen Augen – und trotzdem geradeaus.',
      'Zwischen Koma und Turbo liegt bei Kater Morgana nur ein Schluck Kaffee.',
      'Kater Morgana bittet um etwas weniger Publikumslärm.',
      'Die Augenringe wehen im Wind: Kater Morgana zieht an.',
      'Kater Morgana rennt jetzt. Warum, weiß niemand, auch Morgana nicht.',
    ],
  },
  {
    id: 'schnapsidee',
    number: 4,
    name: 'Schnapsidee',
    color: '#2ED573',
    colorLight: '#8CE5A7',
    colorDark: '#1E9E52',
    coat: '#EAF7E5',
    coatDark: '#B8D9AE',
    mane: '#3F7A2E',
    accessory: 'clover',
    character: 'Chaotisch, macht Dinge, die niemand versteht.',
    commentary: [
      'Schnapsidee nimmt eine Abkürzung, die es nicht gibt.',
      'Schnapsidee hat einen Plan. Der Plan hat kein Ziel.',
      'Niemand weiß, was Schnapsidee vorhat – Schnapsidee am allerwenigsten.',
      'Das Kleeblatt wackelt, das Chaos galoppiert mit.',
      'Schnapsidee macht das Gegenteil von dem, was sinnvoll wäre. Und es klappt.',
      'Schnapsidee überholt außen. Und innen. Irgendwie beides.',
    ],
  },
  {
    id: 'hopfen',
    number: 5,
    name: 'Hopfen Hengst',
    color: '#FFD32A',
    colorLight: '#FFE47F',
    colorDark: '#D4A800',
    coat: '#C97B34',
    coatDark: '#8A4E1C',
    mane: '#F3D9A4',
    accessory: 'pretzel',
    character: 'Gemütlich, bayrisch, kraftvoll aber träge.',
    commentary: [
      'Hopfen Hengst rollt an – wie ein Fass, das den Berg runter will.',
      'Hopfen Hengst hat keine Eile. Hopfen Hengst hat Masse.',
      'Gemütlich ist nicht langsam, sagt Hopfen Hengst. Und wird schneller.',
      'Die Brezel wippt im Takt: Hopfen Hengst kommt in Fahrt.',
      'Hopfen Hengst schnauft einmal kräftig – das war die Ankündigung.',
      'Ein Hengst, ein Bauch, ein Ziel.',
    ],
  },
  {
    id: 'wodka',
    number: 6,
    name: 'Wodka Wirbel',
    color: '#18DCFF',
    colorLight: '#80E9F4',
    colorDark: '#0FA6C2',
    coat: '#DCE6EC',
    coatDark: '#9FB3C0',
    mane: '#8FA9B8',
    accessory: 'ushanka',
    character: 'Kalt, effizient, nervös zuckend.',
    commentary: [
      'Wodka Wirbel läuft, als hätte jemand die Zeitlupe vergessen.',
      'Wodka Wirbel zeigt keine Emotion. Wodka Wirbel zeigt Tempo.',
      'Eiskalt an der Innenbahn: Wodka Wirbel.',
      'Die Ushanka sitzt, der Blick ist leer, die Beine sind schnell.',
      'Wodka Wirbel zuckt kurz – das war vermutlich Freude.',
      'Frost auf der Bahn, Wodka Wirbel fühlt sich zuhause.',
    ],
  },
];

/** Lookup by id. */
export const HORSES_BY_ID = Object.fromEntries(HORSES.map((horse) => [horse.id, horse]));

/**
 * Returns the horse belonging to an engine runner index.
 * @param {number} index 0..5
 * @returns {Horse}
 */
export function horseByIndex(index) {
  return HORSES[index];
}
