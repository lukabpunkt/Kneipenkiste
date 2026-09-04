/**
 * Einstellungen (GDD §5, Screen 11).
 *
 * Sound, Musik, Vibration, weniger Effekte, Sprache. Modi und Dauern stehen bewusst
 * **nicht** hier, sondern in der Lobby: Sie gehoeren zur Runde, nicht zum Geraet.
 */

import { LOCALES, setLocale, t } from '@/core/i18n';
import type { Locale } from '@/config/rules';
import { setHapticsEnabled } from '../haptics';
import { openSheet, type Sheet } from '../components/sheet';
import type { ScreenContext } from '../router';

export function openSettingsSheet(host: HTMLElement, ctx: ScreenContext): Sheet {
  return openSheet(host, {
    title: t('settings.headline'),
    build: (body) => {
      const list = document.createElement('div');
      list.className = 'settings';

      list.append(
        toggleRow(t('settings.sound'), ctx.session.settings().sound, (value) =>
          ctx.session.setSettings({ sound: value })
        ),
        toggleRow(t('settings.haptics'), ctx.session.settings().haptics, (value) => {
          ctx.session.setSettings({ haptics: value });
          setHapticsEnabled(value);
        }),
        toggleRow(t('settings.lowEffects'), ctx.session.settings().lowEffects, (value) =>
          ctx.session.setSettings({ lowEffects: value })
        ),
        sliderRow(t('settings.music'), ctx.session.settings().music, (value) =>
          ctx.session.setSettings({ music: value })
        ),
        localeRow(ctx)
      );

      body.append(list);
    },
  });
}

function row(label: string): { el: HTMLElement; control: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'settings__row';

  const text = document.createElement('span');
  text.className = 'settings__label';
  text.textContent = label;

  const control = document.createElement('div');
  control.className = 'settings__control';

  el.append(text, control);
  return { el, control };
}

function toggleRow(label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
  const { el, control } = row(label);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'switch';
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-checked', String(value));
  button.setAttribute('aria-label', label);

  let current = value;
  const render = (): void => {
    button.setAttribute('aria-checked', String(current));
    button.dataset.on = String(current);
  };

  button.addEventListener('click', () => {
    current = !current;
    render();
    onChange(current);
  });

  render();
  control.append(button);
  return el;
}

function sliderRow(label: string, value: number, onChange: (value: number) => void): HTMLElement {
  const { el, control } = row(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.step = '5';
  input.value = String(Math.round(value * 100));
  input.className = 'slider';
  input.setAttribute('aria-label', label);
  input.addEventListener('input', () => onChange(Number(input.value) / 100));

  control.append(input);
  return el;
}

function localeRow(ctx: ScreenContext): HTMLElement {
  const { el, control } = row(t('settings.language'));

  for (const locale of LOCALES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip chip--locale';
    button.textContent = locale.toUpperCase();
    button.setAttribute('aria-pressed', String(ctx.session.settings().locale === locale));
    button.addEventListener('click', () => {
      ctx.session.setSettings({ locale: locale as Locale });
      setLocale(locale);
      /* Der ganze Screen wird neu gebaut — alle Texte kommen aus `t()`. */
      void ctx.router.refresh();
    });
    control.append(button);
  }

  return el;
}
