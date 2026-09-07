/**
 * Der Schritt — DOM-Platzhalter (Roadmap M1.4).
 *
 * Ab M2 steht hier die PIXI-Schlucht. Was hier schon **echt** ist, ist die Dramaturgie:
 * Der Screen spielt das `StepScript` des Choreographers ab, mit seinen tatsächlichen
 * Zeiten. Alle Hikers kommen im selben Frame an, jeder besetzte Balken knarrt (die
 * sicheren leiser), die Kollisionspaare sehen sich an, bevor ihr Balken bricht, und
 * getippt werden darf erst nach dem letzten Bruch. Nur das Bild ist ein Platzhalter,
 * nicht das Timing.
 *
 * Eine dokumentierte Abweichung: Das Nachspiel startet kurz nach dem letzten Bruch statt
 * nach `FALL_SEQUENCE_MS`. Dieses Zeitfenster gehört den Fall-Sequenzen aus M4 — hier
 * gibt es nichts, was es füllen könnte, und eine leere Bühne fünf Sekunden anzustarren
 * wäre kein Platzhalter, sondern ein Fehler.
 */

import { HUD } from '@/config/choreo';
import { t } from '@/core/i18n';
import { vibrate } from '../haptics';
import { createBridgeTop, type PlankMarker, type PlankModel } from '../components/bridgeTop';
import { createButton } from '../components/button';
import type { PlankId } from '@/core/types';
import type { ScreenContext, ScreenInstance } from '../router';

export function createStepScreen(ctx: ScreenContext): ScreenInstance {
  const reveal = ctx.reveal();
  const script = ctx.stepScript();

  const el = document.createElement('section');
  el.className = 'screen screen--step';

  const sign = document.createElement('p');
  sign.className = 'step__sign';
  sign.setAttribute('aria-live', 'polite');
  if (script.intro.deathZone) {
    sign.dataset.kind = 'deathzone';
    sign.textContent = t('step.deathZoneSign', { count: reveal.planks.length });
  }

  const bridgeBox = document.createElement('div');
  bridgeBox.className = 'step__bridge';

  const bubbles = document.createElement('div');
  bubbles.className = 'step__bubbles';
  bubbles.setAttribute('aria-live', 'polite');

  const skip = createButton({
    label: t('step.skip'),
    variant: 'primary',
    className: 'step__skip',
    disabled: true,
    onClick: () => finish(),
  });

  el.append(sign, bridgeBox, bubbles, skip);

  /* --- Modell der Brücke, das sich im Lauf der Show verändert --- */

  const markersFor = (plank: PlankId): PlankMarker[] =>
    (reveal.planks.find((p) => p.id === plank)?.players ?? []).map((playerId) => ({
      playerId,
      colorId: ctx.session.colorOf(playerId),
    }));

  /** Vor dem Schritt steht noch niemand auf der Brücke. */
  const state = new Map<PlankId, PlankModel>(
    reveal.planks.map((plank) => [plank.id, { id: plank.id, state: 'normal', markers: [] }])
  );

  /** Erst im Nachspiel wahr — vorher gibt es die Lücke noch nicht. */
  let rotted = false;

  const renderBridge = (): void => {
    bridgeBox.replaceChildren();
    bridgeBox.append(
      createBridgeTop({
        planks: [...state.values()],
        display: true,
        removed: rotted && script.removedPlank !== undefined ? [script.removedPlank] : [],
        ariaLabel: t('sealed.headline'),
      })
    );
  };

  const timers: ReturnType<typeof setTimeout>[] = [];
  let finished = false;

  const at = (ms: number, action: () => void): void => {
    timers.push(globalThis.setTimeout(action, Math.max(0, ms)));
  };

  const clearTimers = (): void => {
    for (const timer of timers) clearTimeout(timer);
    timers.length = 0;
  };

  const finish = (): void => {
    if (finished) return;
    finished = true;
    clearTimers();
    ctx.fsm.send({ type: 'showFinished' });
  };

  const bubble = (text: string, kind = 'oh'): void => {
    const el2 = document.createElement('span');
    el2.className = 'step__bubble';
    el2.dataset.kind = kind;
    el2.textContent = text;
    bubbles.append(el2);
    globalThis.setTimeout(() => el2.remove(), 1800);
  };

  /* --- Die Zeitachse aus dem Skript --- */

  /* Anlauf: Alle laufen los. */
  at(script.intro.endsAt, () => {
    el.dataset.phase = 'run';
  });

  /* Der Schritt: Alle stehen im selben Frame auf ihren Balken. Hit-Stop. */
  at(script.step.at, () => {
    el.dataset.phase = 'step';
    for (const [plank, model] of state) model.markers = markersFor(plank);
    renderBridge();
    vibrate('step');
  });

  /* Knarren: jeder besetzte Balken, die sicheren leiser (ADR-3). */
  for (const creak of script.creak) {
    at(script.step.at + script.step.hitStopMs, () => {
      const model = state.get(creak.plank);
      if (!model) return;
      model.state = 'normal';
      renderBridge();
      const node = bridgeBox.querySelector<HTMLElement>(`[data-plank="${creak.plank}"]`);
      node?.style.setProperty('--creak-amplitude', String(creak.amplitude));
      node?.setAttribute('data-creaking', 'true');
    });

    /* Der morsche Balken fällt mitten im Knarren aus der Tarnung. */
    if (creak.revealAt !== undefined && creak.amplitudeEnd !== undefined) {
      at(creak.revealAt, () => {
        const node = bridgeBox.querySelector<HTMLElement>(`[data-plank="${creak.plank}"]`);
        node?.style.setProperty('--creak-amplitude', String(creak.amplitudeEnd));
      });
    }
  }

  /* Blickkontakt — die Signatur. Immer vor dem Bruch, immer mit "Oh." (ADR-3). */
  for (const look of script.eyeContact) {
    at(look.at, () => {
      el.dataset.phase = 'eyeContact';
      const node = bridgeBox.querySelector<HTMLElement>(`[data-plank="${look.plank}"]`);
      node?.setAttribute('data-eye-contact', 'true');
      bubble(t('step.oh'));
    });
  }

  /* Bruch, nacheinander. */
  for (const entry of script.breaks) {
    at(entry.at, () => {
      el.dataset.phase = 'break';
      const model = state.get(entry.plank);
      if (!model) return;

      const group = reveal.planks.find((p) => p.id === entry.plank);
      model.state = group?.rotten ? 'resultRotten' : 'resultCollision';
      renderBridge();

      const node = bridgeBox.querySelector<HTMLElement>(`[data-plank="${entry.plank}"]`);
      node?.setAttribute('data-breaking', 'true');
      vibrate('snap');

      if (group?.rotten) bubble(t('step.seriously'), 'rotten');
    });
  }

  /* Die Sicheren atmen aus, sobald es das erste Mal kracht. */
  for (const safe of script.safe) {
    at(safe.at, () => {
      const plank = reveal.planks.find((p) => p.players.includes(safe.hikerId));
      if (!plank) return;
      const model = state.get(plank.id);
      if (!model) return;
      model.state = 'resultSafe';
      renderBridge();
    });
  }

  /*
   * Nachspiel. Der 5-Sekunden-Puffer des Skripts gehört den Fall-Sequenzen aus M4;
   * hier folgt es dem letzten Bruch direkt.
   */
  const aftermathAt = script.skippableFrom + HUD.placeholderStepMs;

  at(script.skippableFrom, () => {
    /* Tap-to-Skip erst jetzt — nie vor dem letzten Bruch (GDD §4.2). */
    skip.disabled = false;
  });

  at(aftermathAt, () => {
    el.dataset.phase = 'aftermath';

    if (script.aftermath.kind === 'allSafeRot' && script.removedPlank !== undefined) {
      rotted = true;
      state.delete(script.removedPlank);
      renderBridge();
      sign.dataset.kind = 'rot';
      sign.textContent = t('step.rotSign', { plank: script.removedPlank });
      vibrate('rot');
    } else {
      sign.dataset.kind = 'repair';
      sign.textContent = t('step.repairedSign');
      for (const model of state.values()) {
        if (model.state === 'resultCollision' || model.state === 'resultRotten') model.state = 'normal';
      }
      renderBridge();
    }

    if (reveal.deserters.length > 0) bubble(t('banner.desertion'), 'stamp');
  });

  /* Von selbst weiter, wenn niemand tippt — das Handy liegt in der Mitte. */
  at(aftermathAt + HUD.placeholderStepMs, finish);

  renderBridge();

  return {
    el,
    destroy: clearTimers,
  };
}
