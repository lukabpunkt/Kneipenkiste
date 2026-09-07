/**
 * Einstellungen (GDD §5, Screen 9).
 *
 * Ton, Musik, Vibration, weniger Effekte, Sprache — und der Knopf, der die Session
 * wegwirft. Die Balancing-Einstellungen (Haerte, Dauern, Modi) leben bewusst in der
 * Lobby: Dort trifft man sie gemeinsam, nicht versteckt in einem Menue.
 */

import { LOCALES, type Locale } from '@/config/rules';
import { clearHistory, loadHistory } from '@/core/history';
import { setLocale, t } from '@/core/i18n';
import { openSheet, type SheetHandle } from '@/ui/components/sheet';
import { showToast } from '@/ui/components/toast';
import { setHapticsEnabled, vibrate } from '@/ui/haptics';
import type { ScreenContext } from '@/ui/router';

function createSwitch(label: string, value: boolean, onChange: (next: boolean) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings__row';

  const text = document.createElement('span');
  text.className = 'settings__label';
  text.textContent = label;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'switch';
  toggle.setAttribute('role', 'switch');

  const knob = document.createElement('span');
  knob.className = 'switch__knob';
  toggle.append(knob);

  const apply = (next: boolean): void => {
    toggle.classList.toggle('is-on', next);
    toggle.setAttribute('aria-checked', String(next));
    toggle.setAttribute('aria-label', `${label}: ${next ? t('common.on') : t('common.off')}`);
  };
  apply(value);

  let current = value;
  toggle.addEventListener('click', () => {
    current = !current;
    apply(current);
    onChange(current);
  });

  row.append(text, toggle);
  return row;
}

function createSegmented<T extends string | number>(
  label: string,
  values: readonly T[],
  current: T,
  format: (value: T) => string,
  onPick: (value: T) => void
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings__row';

  const text = document.createElement('span');
  text.className = 'settings__label';
  text.textContent = label;

  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', label);

  for (const value of values) {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'segmented__option';
    option.classList.toggle('is-active', value === current);
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(value === current));
    option.textContent = format(value);
    option.addEventListener('click', () => {
      for (const sibling of group.children) {
        sibling.classList.remove('is-active');
        sibling.setAttribute('aria-checked', 'false');
      }
      option.classList.add('is-active');
      option.setAttribute('aria-checked', 'true');
      onPick(value);
    });
    group.append(option);
  }

  row.append(text, group);
  return row;
}

export function createSettingsSheet(ctx: ScreenContext): SheetHandle {
  const settings = ctx.session.state.settings;

  const content = document.createElement('div');
  content.className = 'settings';

  content.append(
    createSwitch(t('settings.sound'), settings.sound, (sound) => ctx.session.setSettings({ sound })),
    createSwitch(t('settings.haptics'), settings.haptics, (haptics) => {
      ctx.session.setSettings({ haptics });
      setHapticsEnabled(haptics);
      if (haptics) vibrate('tap');
    }),
    createSwitch(t('settings.lowEffects'), settings.lowEffects, (lowEffects) =>
      ctx.session.setSettings({ lowEffects })
    )
  );

  const music = document.createElement('div');
  music.className = 'settings__row';
  const musicLabel = document.createElement('span');
  musicLabel.className = 'settings__label';
  musicLabel.textContent = t('settings.music');
  const slider = document.createElement('input');
  slider.className = 'slider';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '5';
  slider.value = String(Math.round(settings.music * 100));
  slider.setAttribute('aria-label', t('settings.music'));
  slider.addEventListener('input', () => ctx.session.setSettings({ music: Number(slider.value) / 100 }));
  music.append(musicLabel, slider);
  content.append(music);

  content.append(
    createSegmented<Locale>(
      t('settings.language'),
      LOCALES,
      settings.locale,
      (locale) => locale.toUpperCase(),
      (locale) => {
        ctx.session.setSettings({ locale });
        setLocale(locale);
        // Der Sprachwechsel muss sofort sichtbar sein — sonst glaubt niemand, dass er
        // gegriffen hat. Sheet zu, Screen neu bauen.
        handle.close();
        void ctx.router.refresh();
      }
    )
  );

  /*
   * Die Historie loeschen ist ein eigener Knopf und nicht Teil von "Session
   * zuruecksetzen": Sie sind zwei verschiedene Dinge. Der Session-Reset ist Spielbetrieb
   * (neue Runde, gleiche Leute), das hier ist Datensparsamkeit — auf dem Geraet liegen
   * Namen mit Trinkdaten, und wer sie loswerden will, soll das koennen, ohne die laufende
   * Runde anzufassen (ADR-35).
   *
   * Nur sichtbar, wenn es ueberhaupt etwas zu loeschen gibt.
   */
  if (Object.keys(loadHistory()).length > 0) {
    const forget = document.createElement('button');
    forget.type = 'button';
    forget.className = 'btn btn--ghost settings__forget';
    forget.textContent = t('settings.forgetHistory');
    forget.addEventListener('click', () => {
      clearHistory();
      forget.remove();
      showToast(t('settings.historyGone'));
    });
    content.append(forget);
  }

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn--danger settings__reset';
  reset.textContent = t('settings.reset');
  reset.addEventListener('click', () => {
    ctx.session.resetRounds();
    handle.close();
    void ctx.router.refresh();
  });
  content.append(reset);

  const handle = openSheet({ title: t('settings.headline'), content });
  return handle;
}
