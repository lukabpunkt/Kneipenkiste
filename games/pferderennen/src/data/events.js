/**
 * Data table of all race events: id, weight, effect, animation, commentary, optional drinking
 * rule. Pure data — the logic that turns an effect into a speed modifier lives in
 * engine/effects.js, and the scheduler in engine/eventScheduler.js decides when it fires.
 *
 * FAIRNESS: nothing here is tied to a horse. The scheduler draws the affected runner uniformly,
 * and every effect is the same function for every runner. Negative events are deliberately more
 * common than positive ones because they are funnier — that is fair as long as it hits everyone
 * equally, which it does (docs/03_RACE_ENGINE.md §6.3).
 *
 * Effect shapes:
 *   {kind: 'constant', mod, duration, attack, release, anim, sticky?}
 *   {kind: 'sequence', steps: [{mod, duration, attack, release, anim}]}
 *   {kind: 'wave', amplitude, frequency, duration, attack, release, anim}
 *   null                                       show events, no effect on any speed
 *
 * `mod` is a relative speed modifier: -1 is a standstill, +0.35 is 35 % faster. `attack` and
 * `release` are the fade in and out in seconds. `lead` is how long before the effect the prop
 * has to start flying so it lands on the beat (docs/03_RACE_ENGINE.md §6.1).
 */

/** Weight of an everyday event, a rarer one, and the once-in-a-blue-moon UFO. */
const COMMON = 100;
const RARE = 40;
const UNICORN = 2;

/**
 * @typedef {{sips: number, direction: 'drink'|'deal', scope: 'backers'|'everyone'}} DrinkRule
 * @typedef {object} RaceEventDefinition
 * @property {string} id
 * @property {string} name
 * @property {'negative'|'positive'|'show'} kind
 * @property {number} weight
 * @property {object|null} effect
 * @property {number} lead      seconds the prop needs before the effect begins
 * @property {string[]} commentary
 * @property {DrinkRule|null} drinkRule
 */

/** @type {RaceEventDefinition[]} */
export const EVENTS = [
  // --- Negative: the horse loses ground ------------------------------------
  {
    id: 'banana',
    name: 'Bananenschale',
    kind: 'negative',
    weight: COMMON,
    // Deliberately abrupt: a banana skid should snap, not fade in.
    effect: {
      kind: 'constant',
      mod: -0.9,
      duration: 0.8,
      attack: 0.02,
      release: 0.25,
      anim: 'slip',
    },
    lead: 1,
    commentary: ['Wer wirft hier Bananen?!', 'Ausgerechnet eine Bananenschale!'],
    drinkRule: { sips: 1, direction: 'drink', scope: 'backers' },
  },
  {
    id: 'stumble',
    name: 'Umknicken',
    kind: 'negative',
    weight: COMMON,
    effect: {
      kind: 'sequence',
      steps: [
        { mod: -0.95, duration: 0.6, attack: 0.05, release: 0.15, anim: 'stumble' },
        { mod: -0.15, duration: 2, attack: 0.15, release: 0.4, anim: 'limp' },
      ],
    },
    lead: 0,
    commentary: ['Autsch! Das war der Knöchel.', 'Das sah schmerzhaft aus.'],
    drinkRule: null,
  },
  {
    id: 'vomit',
    name: 'Kotzen',
    kind: 'negative',
    weight: COMMON,
    effect: { kind: 'constant', mod: -1, duration: 1.5, attack: 0.15, release: 0.4, anim: 'vomit' },
    lead: 0,
    commentary: ['Zu viel Hafer-Schnaps gestern!', 'Das kommt jetzt alles wieder hoch.'],
    drinkRule: { sips: 1, direction: 'drink', scope: 'backers' },
  },
  {
    id: 'pee',
    name: 'Pinkelpause',
    kind: 'negative',
    weight: RARE,
    effect: { kind: 'constant', mod: -1, duration: 1.2, attack: 0.2, release: 0.3, anim: 'pee' },
    lead: 0,
    commentary: ["Wenn's drückt, dann drückt's.", 'Jetzt? Wirklich jetzt?'],
    drinkRule: null,
  },
  {
    id: 'nap',
    name: 'Nickerchen',
    kind: 'negative',
    weight: RARE,
    effect: {
      kind: 'sequence',
      steps: [
        { mod: -1, duration: 1, attack: 0.5, release: 0.1, anim: 'sleep' },
        { mod: 0.3, duration: 1, attack: 0.1, release: 0.3, anim: 'wake' },
      ],
    },
    lead: 0,
    commentary: ['Ist das… Schnarchen?', 'Mitten im Rennen einschlafen – auch eine Taktik.'],
    drinkRule: null,
  },
  {
    id: 'pigeon',
    name: 'Tauben-Attacke',
    kind: 'negative',
    weight: COMMON,
    effect: {
      kind: 'constant',
      mod: -0.25,
      duration: 1.5,
      attack: 0.1,
      release: 0.3,
      anim: 'confused',
    },
    lead: 1.2,
    commentary: ['Eine Taube! Mitten im Rennen!', 'Die Taube hat eindeutig Hausverbot.'],
    drinkRule: null,
  },
  {
    id: 'hiccup',
    name: 'Schluckauf',
    kind: 'negative',
    weight: RARE,
    effect: {
      kind: 'wave',
      amplitude: 0.2,
      frequency: 12,
      duration: 2,
      attack: 0.1,
      release: 0.2,
      anim: 'hiccup',
    },
    lead: 0,
    commentary: ['Hicks!', 'Schluckauf im Galopp – das rüttelt.'],
    drinkRule: { sips: 1, direction: 'drink', scope: 'everyone' },
  },
  {
    id: 'mud',
    name: 'Schlammloch',
    kind: 'negative',
    weight: COMMON,
    effect: {
      kind: 'constant',
      mod: -0.3,
      duration: 1,
      attack: 0.05,
      release: 0.3,
      anim: 'gallop',
    },
    lead: 0,
    commentary: ['Direkt in die Pfütze!', 'Das gibt Flecken.'],
    drinkRule: null,
  },
  {
    id: 'selfie',
    name: 'Foto-Pause',
    kind: 'negative',
    weight: RARE,
    effect: { kind: 'constant', mod: -1, duration: 1, attack: 0.15, release: 0.3, anim: 'pose' },
    lead: 0.8,
    commentary: ['Erst mal ein Selfie!', 'Das Rennen kann warten, das Foto nicht.'],
    drinkRule: null,
  },
  {
    id: 'grass',
    name: 'Grasen',
    kind: 'negative',
    weight: RARE,
    effect: {
      kind: 'constant',
      mod: -0.4,
      duration: 1.5,
      attack: 0.2,
      release: 0.4,
      anim: 'graze',
    },
    lead: 0,
    commentary: ['Mittagspause?', 'Das Gras ist hier wirklich saftig.'],
    drinkRule: null,
  },
  {
    id: 'confused',
    name: 'Orientierungslos',
    kind: 'negative',
    weight: RARE,
    // Below -1, so the net speed goes negative and the horse actually runs backwards.
    effect: {
      kind: 'constant',
      mod: -1.6,
      duration: 0.7,
      attack: 0.15,
      release: 0.25,
      anim: 'confused',
    },
    lead: 0,
    commentary: ['Falsche Richtung, Kumpel!', 'Das Ziel ist da hinten!'],
    drinkRule: null,
  },
  {
    id: 'wardrobe',
    name: 'Hufeisen weg',
    kind: 'negative',
    weight: RARE,
    effect: {
      kind: 'constant',
      mod: -0.1,
      duration: Number.POSITIVE_INFINITY,
      attack: 0.2,
      release: 0,
      anim: null,
      sticky: true,
    },
    lead: 0,
    commentary: ['Da fliegt das Glück davon!', 'Ein Hufeisen weniger.'],
    drinkRule: null,
  },

  // --- Positive: the horse gains ground ------------------------------------
  {
    id: 'carrot',
    name: 'Möhre am Stock',
    kind: 'positive',
    weight: COMMON,
    effect: {
      kind: 'constant',
      mod: 0.35,
      duration: 1.5,
      attack: 0.3,
      release: 0.5,
      anim: 'gallop_fast',
    },
    lead: 0.8,
    commentary: ['Möhre gesichtet! Turbo!', 'Für eine Möhre tut man alles.'],
    drinkRule: null,
  },
  {
    id: 'rainbow_fart',
    name: 'Regenbogen-Furz',
    kind: 'positive',
    weight: RARE,
    effect: {
      kind: 'constant',
      mod: 0.5,
      duration: 1,
      attack: 0.1,
      release: 0.4,
      anim: 'gallop_fast',
    },
    lead: 0,
    commentary: ['Der Antrieb der Zukunft.', 'Das war… bunt.'],
    drinkRule: { sips: 1, direction: 'drink', scope: 'everyone' },
  },
  {
    id: 'jockey_off',
    name: 'Jockey fällt runter',
    kind: 'positive',
    weight: RARE,
    effect: {
      kind: 'constant',
      mod: 0.2,
      duration: 2,
      attack: 0.2,
      release: 0.5,
      anim: 'gallop_fast',
    },
    lead: 0,
    commentary: ["Ohne Ballast läuft's besser!", 'Der Jockey macht jetzt Pause.'],
    drinkRule: { sips: 1, direction: 'deal', scope: 'backers' },
  },
  {
    id: 'espresso',
    name: 'Espresso-Kick',
    kind: 'positive',
    weight: COMMON,
    effect: {
      kind: 'constant',
      mod: 0.3,
      duration: 2,
      attack: 0.15,
      release: 0.5,
      anim: 'gallop_fast',
    },
    lead: 0.6,
    commentary: ['Doppelter Espresso, doppeltes Tempo!', 'Koffein wirkt.'],
    drinkRule: null,
  },
  {
    id: 'tailwind',
    name: 'Rückenwind',
    kind: 'positive',
    weight: COMMON,
    effect: {
      kind: 'constant',
      mod: 0.2,
      duration: 2,
      attack: 0.3,
      release: 0.6,
      anim: 'gallop_fast',
    },
    lead: 0,
    commentary: ['Der Wind hat Favoriten!', 'Rückenwind – geschenkt ist geschenkt.'],
    drinkRule: null,
  },
  {
    id: 'rocket_boots',
    name: 'Feder-Hufe',
    kind: 'positive',
    weight: RARE,
    effect: { kind: 'constant', mod: 0.4, duration: 1, attack: 0.1, release: 0.3, anim: 'fly' },
    lead: 0,
    commentary: ['Boing! Boing!', 'Das war kein Galopp, das war ein Sprung.'],
    drinkRule: null,
  },

  // --- Show: pure spectacle, no effect on anyone's speed --------------------
  {
    id: 'streaker',
    name: 'Flitzer',
    kind: 'show',
    weight: RARE,
    effect: null,
    lead: 1.5,
    commentary: ['Ein Flitzer! Sicherheit! SICHERHEIT!', 'Der hat definitiv kein Ticket.'],
    drinkRule: null,
  },
  {
    id: 'tumbleweed',
    name: 'Steppenläufer',
    kind: 'show',
    weight: RARE,
    effect: null,
    lead: 2,
    commentary: ['…', 'Kein Kommentar.'],
    drinkRule: null,
  },
  {
    id: 'camera_flash',
    name: 'Blitzlichtgewitter',
    kind: 'show',
    weight: RARE,
    effect: null,
    lead: 0,
    commentary: ['Die Presse ist außer Rand und Band!', 'Blitzlicht von allen Seiten.'],
    drinkRule: null,
  },
  {
    id: 'ufo',
    name: 'UFO',
    kind: 'show',
    weight: UNICORN,
    effect: null,
    lead: 2.5,
    commentary: ['Hab ich das gerade wirklich gesehen?', 'Das stand so nicht im Programmheft.'],
    drinkRule: null,
  },
];

/**
 * Slipstream is not scheduled ahead of time — the runtime checks whether a runner is sitting
 * right behind another one and rolls for it then (docs/03_RACE_ENGINE.md §6.1, point 6).
 * @type {RaceEventDefinition}
 */
export const SLIPSTREAM = {
  id: 'slipstream',
  name: 'Windschatten',
  kind: 'positive',
  weight: 0,
  effect: {
    kind: 'constant',
    mod: 0.15,
    duration: 1.5,
    attack: 0.2,
    release: 0.4,
    anim: 'gallop_fast',
  },
  lead: 0,
  commentary: [
    'Windschatten – clever!',
    'Er hängt sich ran und lässt sich ziehen.',
    'Da wird der Vordermann als Windschutz benutzt.',
    'Schön eingefädelt, das spart Kraft.',
    'Sitzt im Sog und wartet ab.',
    'Kein Kraftakt, nur Physik.',
  ],
  // Slipstream is not scheduled like the other events — the engine emits it whenever two runners
  // line up, so it happens several times a race. It gets the quieter priority, otherwise it would
  // crowd the funny stuff off the line.
  minor: true,
  drinkRule: null,
};

/** Events the scheduler may plan, as {value, weight} pairs for rng.weighted(). */
export const SCHEDULABLE = EVENTS.map((event) => ({ value: event.id, weight: event.weight }));

/** Lookup by id, including slipstream. */
export const EVENTS_BY_ID = Object.fromEntries(
  [...EVENTS, SLIPSTREAM].map((event) => [event.id, event]),
);
