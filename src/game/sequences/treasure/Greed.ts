/**
 * `treasure_greed` — "Der Preis der Gier" (GDD §3.6, §4.2).
 *
 * Erst der Knall, dann kommt die Kiste angesengt aus dem Rauch: Der Graeber steht
 * russgeschwaerzt da, grinst mit der Zahnluecke und hat trotzdem gewonnen. Das ist der
 * beste Doppelmoment des Spiels und der Grund, warum die letzte Grabung nie sicher ist.
 *
 * ## Warum der Jubel hinter dem Ring kommt
 *
 * Diese Sequenz ist zuerst eine Explosion und erst danach ein Fund. Der Ring des Legers
 * liegt deshalb auf demselben Versatz wie in jeder Hit-Sequenz — die Frage, wer den
 * Graeber gerade hochgejagt hat, darf nicht hinter der Kiste verschwinden
 * (Design-Prioritaet 2).
 */

import gsap from 'gsap';
import { EXPLOSION } from '@/config/choreo';
import { UI_COLORS } from '@/config/theme';
import type { CueAt, DigSequence } from '../Sequence';
import { liftLid, scheduleCues } from '../Sequence';

const RING_AT = EXPLOSION.ringDelayMs / 1000;

/*
 * Alle Digger-Bewegungen sind **relativ** (`'-=…'`). Die Sequenz wird gebaut, waehrend der
 * Digger noch auf der Bank sitzt, und laeuft erst, nachdem er an der Platte steht: Ein
 * absoluter Zielwert waere zur Bauzeit an der falschen Stelle abgelesen. GSAP loest
 * relative Werte beim Start des Tweens auf — und `yoyo` bringt sie von allein zurueck.
 */

export const greedSequence: DigSequence = {
  id: 'treasure_greed',
  kind: 'greed',
  weight: 1,
  build(context) {
    const { tile, digger, camera, fx } = context;
    const timeline = gsap.timeline();
    const size = tile.size;
    const content = tile.contentView;

    const cues: CueAt[] = [
      { cue: 'explosion_m', at: 0 },
      { cue: 'crowd_gasp', at: 0.14 },
      // Aus dem Rauch: die Fanfare kommt tiefer und spaeter — sie hat gelitten.
      { cue: 'treasure_fanfare', at: 0.85, detune: -500 },
      { cue: 'bottle_clink', at: 1.25 },
      { cue: 'crowd_laugh', at: 1.5 },
    ];

    /* --- Erst der Knall --------------------------------------------- */
    timeline.addLabel(EXPLOSION.frameLabel, 0);
    const lid = liftLid(timeline, tile);
    timeline.to(
      lid,
      {
        y: -size * 0.8,
        rotation: 1.6,
        alpha: 0,
        duration: 0.34,
        ease: 'power2.out',
        onComplete: () => tile.dropLid(),
      },
      0
    );
    timeline.add(() => {
      digger.soot();
      camera.shake();
    }, 0);
    /*
     * Seit M4 kommt der Knall aus demselben Effekt-Kasten wie die Hit-Sequenzen (M4.4):
     * derselbe Rauchpilz, dieselbe Erde. Der Preis der Gier soll aussehen wie eine
     * Explosion, in der zufaellig eine Kiste stand — nicht wie ein eigenes Ereignis.
     */
    timeline.add(fx.smoke(tile.view.x, tile.view.y, 1.1), 0);
    timeline.add(fx.dirt(tile.view.x, tile.view.y, 12), 0);
    timeline.to(digger.view, { y: `-=${size * 0.55}`, duration: 0.22, ease: 'power2.out' }, 0);
    timeline.to(digger.view, { y: `+=${size * 0.55}`, duration: 0.3, ease: 'bounce.out' });

    /* --- Der Schuldige, vor dem Jubel -------------------------------- */
    timeline.addLabel(EXPLOSION.ringLabel, RING_AT);
    timeline.fromTo(
      tile.marksView.scale,
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1, duration: EXPLOSION.ringGrowMs / 1000, ease: 'back.out(2.4)', immediateRender: false },
      EXPLOSION.ringLabel
    );

    /* --- Und dann kommt die Kiste angesengt aus dem Rauch ------------ */
    timeline.fromTo(content, { alpha: 0 }, { alpha: 1, duration: 0.2, immediateRender: false }, 0.85);
    timeline.fromTo(
      content,
      { y: size * 0.3 },
      { y: -size * 0.14, duration: 0.5, ease: 'back.out(1.8)', immediateRender: false },
      0.85
    );
    timeline.fromTo(
      content.scale,
      { x: 0.6, y: 0.6 },
      { x: 1, y: 1, duration: 0.5, ease: 'back.out(1.8)', immediateRender: false },
      0.85
    );

    /*
     * Das Grinsen mit der Zahnluecke: Er ist rußgeschwaerzt und hat trotzdem gewonnen.
     * `smug_gap_tooth` ueberschreibt hier bewusst das Russ-Gesicht — der Ausdruck ist die
     * Pointe der Sequenz und kommt erst, wenn die Kiste steht.
     */
    timeline.add(() => digger.setFace('smug_gap_tooth'), 1.3);
    // Grauer Konfetti: Auch der Jubel ist angesengt (GDD §4.2).
    timeline.add(fx.confetti(tile.view.x, tile.view.y - size * 0.6, UI_COLORS.smoke), 1.35);

    /*
     * Und dann hebt er sie doch noch hoch. Der Schlussakkord haelt die Sequenz bis
     * hinter das Lachen des Publikums — eine Pointe, die vor dem Ton endet, wirkt wie ein
     * Aussetzer.
     */
    timeline.to(content, { y: `-=${size * 0.12}`, duration: 0.28, ease: 'back.out(2)' }, 1.45);
    timeline.to(content, { y: `+=${size * 0.04}`, duration: 0.22, ease: 'sine.inOut' });

    scheduleCues(timeline, context.audio, cues);
    return timeline;
  },
};
