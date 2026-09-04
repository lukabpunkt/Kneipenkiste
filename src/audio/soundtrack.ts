/**
 * Welcher Loop zu welchem Screen gehoert (GDD §6).
 *
 * Zwei Stuecke, klar getrennt: Der Banjo-Loop laeuft, solange nur geredet und
 * eingerichtet wird — der Spannungs-Loop ab dem Moment, in dem jemand etwas vergraebt.
 * Der Wechsel ist dadurch ein Signal: Es geht los.
 *
 * Der Result-Screen laeuft **stumm**. Dort steht, wer wieviel trinkt, und die Zahlen
 * brauchen keinen Teppich; ausserdem redet an dieser Stelle ohnehin der ganze Tisch.
 */

import { startMusic, stopMusic, unlockAudio, type MusicId } from './AudioManager';
import type { ScreenId } from '@/ui/router';

const MUSIC_BY_SCREEN: Partial<Record<ScreenId, MusicId>> = {
  title: 'lobby',
  lobby: 'lobby',
  pass: 'dig',
  place: 'dig',
  buried: 'dig',
  dig: 'dig',
};

/** Setzt den Loop passend zum Screen. Ohne Eintrag ist es still. */
export function updateSoundtrack(screen: ScreenId): void {
  const track = MUSIC_BY_SCREEN[screen];
  if (track) startMusic(track);
  else stopMusic();
}

/**
 * Audio beim ersten echten Tap freischalten.
 *
 * iOS erlaubt Ton erst aus einer Nutzergeste heraus, und zwar **synchron** — deshalb
 * haengt der Listener in der Capture-Phase und laeuft nur einmal. Danach zieht er den
 * Loop des gerade sichtbaren Screens nach, der bis dahin nur vorgemerkt war.
 */
export function installAudioUnlock(currentScreen: () => ScreenId | null): void {
  const unlock = (): void => {
    unlockAudio();
    const screen = currentScreen();
    if (screen) updateSoundtrack(screen);
  };

  for (const type of ['pointerdown', 'keydown'] as const) {
    globalThis.addEventListener(type, unlock, { once: true, capture: true });
  }
}
