/**
 * Die sechs Hinweis-Sequenzen (GDD §4.4, Art Direction §7).
 *
 * **Die Regel, an der alles hängt:** Jede ist visuell eindeutig — man sieht das Wackeln,
 * man sieht den Tropfen — aber danach sieht der Koffer aus wie jeder andere. Kein
 * dunklerer Ton, keine Restneigung, kein „Verdachts-Look". Nur das kleine Icon bleibt,
 * und das setzt der Screen, nicht die Sequenz.
 *
 * Der Grund ist Design-Pfeiler 2: Ein Koffer, der nach dem Hinweis anders aussieht,
 * verspricht eine Sicherheit, die das Hinweis-Modell nicht hergibt. `Suitcase.playHint()`
 * ruft dafür am Ende jeder Timeline `resetAfterHint()` — diese Datei baut nur das drum
 * herum: Tropfen, Federn, Waldi und den Ton.
 */

import gsap from 'gsap';
import { HINTS } from '@/config/choreo';
import { play } from '@/audio/AudioManager';
import type { HintType } from '@/core/types';
import type { Sequence, SequenceContext } from '../Sequence';

/** Sound-Cue je Hinweis. Der Ton liegt auf dem Beat, nicht daneben (Audit A3: ± 50 ms). */
const CUE: Record<HintType, Parameters<typeof play>[0]> = {
  wobble: 'hint_wobble',
  drip: 'hint_drip',
  heavy: 'hint_heavy_creak',
  click: 'hint_click',
  feather: 'hint_feather',
  dog: 'dog_sniff',
};

/**
 * Baut eine Hinweis-Sequenz.
 *
 * Der Koffer-Teil steckt in `Suitcase.playHint()` — dort liegt auch das Zurücksetzen.
 * Hier kommt dazu, was **neben** dem Koffer passiert.
 */
function hintSequence(type: HintType, extras: (ctx: SequenceContext, tl: gsap.core.Timeline) => void): Sequence {
  return {
    id: `hint_${type}`,
    kind: 'hint',
    weight: 1,
    build(ctx) {
      const timeline = gsap.timeline();

      /* Ton zuerst planen: Er liegt auf dem Anfang der Bewegung, nicht auf ihrem Ende. */
      timeline.call(() => play(CUE[type]));
      timeline.add(ctx.suitcase.playHint(type, HINTS.duration), 0);
      extras(ctx, timeline);

      return timeline;
    },
  };
}

/** Der Koffer wackelt, der Anhänger schwingt nach. Alles im Koffer selbst. */
export const WobbleHint = hintSequence('wobble', () => undefined);

/** Ein Tropfen wächst unter dem Koffer, fällt und wird zur Pfütze. */
export const DripHint = hintSequence('drip', (ctx, timeline) => {
  const { x, y } = ctx.suitcase.view;
  timeline.add(ctx.fx.drip(x, y - 6, HINTS.duration * 0.8), 0.1);
});

/** Der Koffer sinkt ein, das Band ächzt, der Beamte hebt eine Augenbraue. */
export const HeavyHint = hintSequence('heavy', (ctx, timeline) => {
  timeline.call(() => ctx.officer.setFace('suspicious'), undefined, HINTS.duration * 0.45);
  timeline.call(() => ctx.officer.setFace('stern'), undefined, HINTS.duration * 0.95);
});

/** Etwas tickt im Koffer. Er vibriert nur minimal — der Ton macht die Arbeit. */
export const ClickHint = hintSequence('click', () => undefined);

/** Eine Feder quillt aus dem Reißverschluss und schwebt davon. */
export const FeatherHint = hintSequence('feather', (ctx, timeline) => {
  const { x, y } = ctx.suitcase.view;
  const top = y - ctx.suitcase.bounds.height * 0.6;
  for (let i = 0; i < 3; i++) {
    timeline.call(() => ctx.fx.feather(x, top, ctx.rng), undefined, 0.15 + i * 0.18);
  }
});

/**
 * Waldi läuft ins Bild, schnüffelt und geht weiter.
 *
 * Er bellt hier **nicht** — dieser Hinweis ist wie alle anderen zu 60 % gelogen. Das
 * Bellen gehört zum Spürhund-Modus, und nur dort ist es verlässlich (GDD §3.7).
 */
export const DogHint = hintSequence('dog', (ctx, timeline) => {
  const target = ctx.suitcase.view.x;
  const home = ctx.view.waldi.view.x;

  timeline.add(ctx.view.waldi.runTo(target, HINTS.duration * 0.35), 0);
  timeline.add(ctx.view.waldi.sniff(), HINTS.duration * 0.4);
  timeline.add(ctx.view.waldi.runTo(home, HINTS.duration * 0.35), HINTS.duration * 0.8);
});

export const HINT_SEQUENCES: readonly Sequence[] = [
  WobbleHint,
  DripHint,
  HeavyHint,
  ClickHint,
  FeatherHint,
  DogHint,
];

/** Die Sequenz zu einem Hinweis-Typ — der Kern hat den Typ längst gewählt. */
export function hintSequenceFor(type: HintType): Sequence {
  const sequence = HINT_SEQUENCES.find((s) => s.id === `hint_${type}`);
  if (!sequence) throw new Error(`Keine Hinweis-Sequenz für "${type}".`);
  return sequence;
}
