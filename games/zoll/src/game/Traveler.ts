/**
 * Der Reisende (Art Direction §5.1) — ein Shotling im Urlaubs-Look.
 *
 * Sonnenhut, Kamera am Hals, Hawaiihemd über dem Torso. Er steht hinter der gelben Linie
 * und reagiert: zu breites Grinsen, steigender Schweiß, unschuldiges Pfeifen, Empörung.
 * Diese Reaktionen sind der einzige Kanal, über den die Bühne etwas verrät — und sie
 * dürfen nichts verraten, was das Spiel geheim hält.
 */

import gsap from 'gsap';
import { LAYOUT, type ColorId } from '@/config/theme';
import type { RandomSource } from '@/core/rng';
import { Shotling, type ShotlingOptions } from './Shotling';

export interface TravelerOptions {
  sheet: ShotlingOptions['sheet'];
  colorId: ColorId;
  rng: RandomSource;
  lowEffects?: boolean;
  /** Ohne Angabe die Standard-Reisendenhöhe. */
  height?: number;
}

export class Traveler extends Shotling {
  constructor(options: TravelerOptions) {
    super({
      sheet: options.sheet,
      colorId: options.colorId,
      rng: options.rng,
      height: options.height ?? LAYOUT.travelerHeight,
      hat: 'hats/sunhat',
      face: 'neutral',
      ...(options.lowEffects === undefined ? {} : { lowEffects: options.lowEffects }),
    });

    /* Hemd zuerst (liegt auf dem Torso), dann die Kamera davor. */
    this.attach('torso', 'accessories/shirt_hawaii', { anchorY: 1 });
    this.attach('neck', 'accessories/camera');
  }

  /**
   * Schweißgrad 0–3. Läuft während des Scans hoch — die Reaktion **vor** der Konsequenz
   * (Art Direction §7): erst das Gesicht, dann der Alarm.
   */
  sweat(level: 0 | 1 | 2 | 3): void {
    this.setFace(level === 0 ? 'neutral' : `sweat_${level}`);
  }

  /** Das verdächtig breite Grinsen — die Standard-Pose im Verhör. */
  smileTooWide(): void {
    this.setFace('too_wide_smile');
  }

  whistleInnocently(): void {
    this.setFace('whistle');
  }

  beOutraged(): void {
    this.setFace('outraged');
  }

  beSmug(): void {
    this.setFace('smug_bow');
  }

  /**
   * Geht durch die Schranke: ein paar Schritte nach rechts, Beine pendeln.
   *
   * Prozedural statt Keyframes, damit dieselbe Bewegung für 2 und für 6 Schritte passt.
   */
  walkThroughGate(toX: number, durationSec: number): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const rig = this.rig;
    const steps = Math.max(2, Math.round(durationSec * 4));

    timeline.to(this.view, { x: toX, duration: durationSec, ease: 'none' }, 0);

    /* Bein-Pendel über die Strecke, nicht über die Zeit — so passt die Frequenz zum Tempo. */
    for (let i = 0; i < steps; i++) {
      const at = (i / steps) * durationSec;
      const swing = i % 2 === 0 ? 0.35 : -0.35;
      timeline.to(rig.legL, { rotation: swing, duration: durationSec / steps, ease: 'sine.inOut' }, at);
      timeline.to(rig.legR, { rotation: -swing, duration: durationSec / steps, ease: 'sine.inOut' }, at);
      timeline.to(
        rig.body,
        { y: i % 2 === 0 ? -3 : 0, duration: durationSec / steps, ease: 'sine.inOut' },
        at
      );
    }

    timeline.to(rig.legL, { rotation: 0, duration: 0.12 }, durationSec);
    timeline.to(rig.legR, { rotation: 0, duration: 0.12 }, durationSec);
    timeline.to(rig.body, { y: 0, duration: 0.12 }, durationSec);

    return timeline;
  }

  /** Winkt kurz — die kleine Geste am Ende von `pass_clean_wave`. */
  wave(): gsap.core.Timeline {
    const timeline = gsap.timeline();
    const arm = this.rig.armR;
    timeline
      .to(arm, { rotation: -1.9, duration: 0.18, ease: 'back.out(2)' })
      .to(arm, { rotation: -1.5, duration: 0.14, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      .to(arm, { rotation: -0.2, duration: 0.18, ease: 'power2.inOut' });
    return timeline;
  }
}
