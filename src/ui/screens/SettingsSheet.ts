/**
 * Einstellungen (GDD §5, Screen 8).
 *
 * Ton, Musik, Vibration, weniger Effekte, Sprache, Session zuruecksetzen.
 * Das Spiel muss stumm voll spielbar sein (GDD §6) — der Ton-Schalter schaltet also
 * nichts weg, was man zum Spielen braucht.
 */

import { LOCALES, type Locale } from '@/config/rules';
import { setLocale, t } from '@/core/i18n';
import type { SessionStore } from '@/core/session';
import { createButton } from '@/ui/components/button';
import { openSheet, type SheetHandle } from '@/ui/components/sheet';
import { setHapticsEnabled } from '@/ui/haptics';

export interface SettingsSheetOptions {
  session: SessionStore;
  /** Der Aufrufer baut seinen Screen neu auf, damit die neuen Texte greifen. */
  onLocaleChange?: () => void;
}

export function openSettingsSheet(options: SettingsSheetOptions): SheetHandle {
  const { session } = options;

  const content = document.createElement('div');
  content.className = 'settings';

  content.append(
    toggleRow(t('settings.sound'), session.state.settings.sound, (value) =>
      session.setSettings({ sound: value })
    ),
    sliderRow(t('settings.music'), session.state.settings.music, (value) =>
      session.setSettings({ music: value })
    ),
    toggleRow(t('settings.haptics'), session.state.settings.haptics, (value) => {
      session.setSettings({ haptics: value });
      setHapticsEnabled(value);
    }),
    toggleRow(t('settings.lowEffects'), session.state.settings.lowEffects, (value) =>
      session.setSettings({ lowEffects: value })
    ),
    localeRow()
  );

  const reset = createButton({
    label: t('settings.resetSession'),
    variant: 'danger',
    className: 'btn--wide',
    onClick: () => {
      session.resetRounds();
      handle.close();
    },
  });
  content.append(reset);

  const handle = openSheet({ title: t('settings.headline'), content });
  return handle;

  /* ---------------------------------------------------------------- */

  function toggleRow(label: string, value: boolean, onChange: (next: boolean) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings__row';

    const name = document.createElement('span');
    name.className = 'settings__label';
    name.textContent = label;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'settings__toggle';
    toggle.setAttribute('role', 'switch');

    const apply = (next: boolean): void => {
      toggle.setAttribute('aria-checked', String(next));
      toggle.classList.toggle('is-on', next);
    };
    apply(value);

    toggle.addEventListener('click', () => {
      const next = toggle.getAttribute('aria-checked') !== 'true';
      apply(next);
      onChange(next);
    });

    row.append(name, toggle);
    return row;
  }

  function sliderRow(label: string, value: number, onChange: (next: number) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings__row';

    const name = document.createElement('span');
    name.className = 'settings__label';
    name.textContent = label;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'settings__slider';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.1';
    slider.value = String(value);
    slider.setAttribute('aria-label', label);
    slider.addEventListener('input', () => onChange(Number(slider.value)));

    row.append(name, slider);
    return row;
  }

  function localeRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings__row';

    const name = document.createElement('span');
    name.className = 'settings__label';
    name.textContent = t('settings.language');

    const group = document.createElement('div');
    group.className = 'settings__locales';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', t('settings.language'));

    for (const locale of LOCALES) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'chip chip--option';
      option.setAttribute('role', 'radio');
      option.textContent = locale.toUpperCase();

      const active = session.state.settings.locale === locale;
      option.setAttribute('aria-checked', String(active));
      option.classList.toggle('is-active', active);

      option.addEventListener('click', () => {
        session.setSettings({ locale: locale as Locale });
        setLocale(locale);
        handle.close();
        options.onLocaleChange?.();
      });
      group.append(option);
    }

    row.append(name, group);
    return row;
  }
}
