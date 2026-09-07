/**
 * Commentary lines for the start, lead changes, the final stretch, photo finish, win and filler.
 *
 * The event lines live with the events themselves in data/events.js — they belong to the thing
 * that happened. Everything here is about the race as a whole. `{horse}` is replaced with the
 * name of the horse the line is about; lines without a placeholder work in any situation.
 *
 * The pools are deliberately larger than one race can consume (the engine rotates through them
 * without repeating), so the commentator does not sound like a loop by the third race of an
 * evening. Total across all pools: well over the 80 lines the milestone asks for.
 */

/** Right after the gates open. */
export const START_LINES = [
  'Und sie sind los!',
  'Die Boxen sind offen – es geht los!',
  'Sechs Pferde, ein Ziel, kein Plan.',
  'Da rennen sie. Warum auch immer.',
  'Der Startschuss ist gefallen, die Würde nicht.',
  'Alle sechs sind unterwegs. Manche sogar in die richtige Richtung.',
  'Das Feld setzt sich in Bewegung!',
  'Los geht die wilde Fahrt.',
];

/** Someone has taken the lead. `{horse}` is the new leader. */
export const LEAD_LINES = [
  '{horse} übernimmt die Führung!',
  'Jetzt liegt {horse} vorn!',
  '{horse} zieht vorbei – das war Absicht!',
  'Und plötzlich: {horse} an der Spitze.',
  '{horse} hat offenbar heute Lust.',
  'Führungswechsel! {horse} macht ernst.',
  '{horse} nimmt sich die Spitze.',
  'Da kommt {horse} und niemand hält dagegen.',
  '{horse} vorn – wie lange wohl?',
  'Neuer Spitzenreiter: {horse}.',
  '{horse} drückt aufs Tempo!',
  'Das Feld dreht sich, {horse} ist vorne.',
  '{horse} setzt sich ab!',
  'An der Spitze jetzt: {horse}.',
  '{horse} lässt die anderen hinter sich.',
  'Und {horse} greift an!',
  '{horse} hat den Kopf vorn.',
  'Kaum zu glauben – {horse} führt.',
];

/** The last third of the track. */
export const FINAL_STRETCH_LINES = [
  'Die Zielgerade!',
  'Jetzt zählt jeder Schritt.',
  'Das letzte Drittel – Anschnallen.',
  'Und rein in die Schlussphase!',
  'Hier wird das Rennen entschieden.',
  'Noch ein Stück. Nur noch ein Stück.',
  'Die Menge steht.',
  'Jetzt oder nie für die hinteren Plätze.',
];

/** Head to head at the line. */
export const PHOTO_FINISH_LINES = [
  'Das wird eng!',
  'Kopf an Kopf!',
  'Das kann niemand mit bloßem Auge entscheiden!',
  'Fotofinish! Alle mal die Luft anhalten.',
  'Ein Blatt Papier passt da nicht dazwischen.',
  'So knapp war das lange nicht!',
];

/** The winner has crossed. `{horse}` is the winner. */
export const WIN_LINES = [
  '{horse} gewinnt!',
  'Sieg für {horse}!',
  'Und {horse} macht das Rennen!',
  '{horse} über die Ziellinie – geschafft!',
  'Der Sieg geht an {horse}.',
  '{horse} holt sich das Ding!',
  'Was für ein Rennen – {horse} gewinnt es.',
  'Ende. {horse} war schneller als der Rest.',
];

/** Nobody had backed the winner. */
export const HOUSE_LINES = [
  'Das Haus gewinnt. Wie immer.',
  'Niemand hatte {horse}. Selbst schuld.',
  'Sechs Pferde, null Treffer. Respekt.',
  'Alle daneben – alle trinken.',
  'Das Haus lacht sich schlapp.',
  'Keiner hat es kommen sehen. Nicht mal {horse}.',
];

/** The quiet moments in between: nothing has happened for a while. */
export const FILLER_LINES = [
  'Das Feld liegt eng beieinander.',
  'Hier ist noch gar nichts entschieden.',
  'Die Hufe donnern über die Bahn.',
  'Ein Pferd überholt. Dann wieder nicht.',
  'Die Tribüne ist gut gefüllt heute.',
  'Sechs Pferde, sechs Meinungen.',
  'Da hinten wird noch geschoben.',
  'Das Tempo zieht an!',
  'Irgendwer muss ja gewinnen.',
  'Noch ist alles offen.',
  'Ein sauberer Galopp, muss man sagen.',
  'Das Feld zieht sich auseinander.',
  'Und wieder rückt jemand auf.',
  'Die Jockeys arbeiten.',
  'Konzentration im Sattel.',
  'Wer hier Ruhe bewahrt, gewinnt.',
  'Die Zuschauer werden lauter.',
  'Noch ist Platz für eine Überraschung.',
  'Das sieht nach Arbeit aus.',
  'Ein Rennen wie aus dem Bilderbuch. Fast.',
];

/** A runner is dead last and falling further behind. `{horse}` is that runner. */
export const TRAILING_LINES = [
  '{horse} hat noch Zeit. Theoretisch.',
  '{horse} genießt die Aussicht von hinten.',
  'Für {horse} wird es langsam eng.',
  '{horse} scheint das anders geplant zu haben.',
  '{horse} sammelt Kräfte. Sehr gründlich.',
];

/** Flavour for a specific horse, keyed by horse id (docs/01_GAME_DESIGN.md §2). */
export const HORSE_LINES = {
  trabsalot: [
    'Sir Trabsalot galoppiert, als hätte er das erfunden.',
    'Adel verpflichtet, sagt Sir Trabsalot.',
    'Sir Trabsalot schaut nicht nach hinten. Zu unfein.',
  ],
  prosecco: [
    'Prosecco Rakete hat gute Laune. Immer.',
    'Prosecco Rakete rennt, als wäre schon Party.',
    'Bei Prosecco Rakete perlt es.',
  ],
  morgana: [
    'Kater Morgana ist wach. Überraschung.',
    'Kater Morgana weiß selbst nicht, was als Nächstes kommt.',
    'Kater Morgana zwischen Turbo und Koma.',
  ],
  schnapsidee: [
    'Schnapsidee macht Dinge, die niemand versteht.',
    'Schnapsidee hat einen Plan. Vermutlich.',
    'Bei Schnapsidee weiß man nie.',
  ],
  hopfen: [
    'Hopfen Hengst nimmt es gemütlich. Aber mit Kraft.',
    'Hopfen Hengst rollt heran wie ein Fass.',
    'Hopfen Hengst hat keine Eile, aber Masse.',
  ],
  wodka: [
    'Wodka Wirbel ist eiskalt.',
    'Wodka Wirbel zuckt nervös – und zieht an.',
    'Wodka Wirbel arbeitet effizient.',
  ],
};
