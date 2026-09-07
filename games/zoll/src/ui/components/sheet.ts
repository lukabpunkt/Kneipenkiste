/**
 * Bottom-Sheet fuer Settings, Regeln und Dialoge (Art Direction §4).
 *
 * Slide-up mit Overshoot, Backdrop zum Schliessen, Escape schliesst, Fokus bleibt drin
 * (Focus-Trap) und geht danach dorthin zurueck, wo er herkam.
 */

import { MOTION } from '@/config/theme';
import { t } from '@/core/i18n';
import { prefersReducedMotion, safeAnimate } from '../animate';
import { ICON_CLOSE, createIconButton } from './button';

export interface SheetOptions {
  title: string;
  /** Inhalt; bekommt das Sheet als Parent. */
  build: (body: HTMLElement, close: () => void) => void;
  onClose?: () => void;
}

export interface Sheet {
  el: HTMLElement;
  close(): void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function openSheet(host: HTMLElement, options: SheetOptions): Sheet {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const el = document.createElement('div');
  el.className = 'sheet';

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet__backdrop';

  const panel = document.createElement('section');
  panel.className = 'sheet__panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', options.title);

  const header = document.createElement('header');
  header.className = 'sheet__header';

  const heading = document.createElement('h2');
  heading.className = 'sheet__title';
  heading.textContent = options.title;

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);

    void safeAnimate(
      panel,
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,100%,0)' }],
      { duration: MOTION.sheetMs, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }
    ).then(() => {
      el.remove();
      options.onClose?.();
      previouslyFocused?.focus?.();
    });
  };

  const closeButton = createIconButton({
    icon: ICON_CLOSE,
    ariaLabel: t('common.close'),
    className: 'sheet__close',
    onClick: close,
  });

  header.append(heading, closeButton);

  const body = document.createElement('div');
  body.className = 'sheet__body';
  options.build(body, close);

  panel.append(header, body);
  el.append(backdrop, panel);
  host.append(el);

  backdrop.addEventListener('click', close);

  /*
   * Focus-Trap: Solange das Sheet offen ist, darf Tab nicht dahinter wandern — sonst
   * bedient man unsichtbare Knoepfe des Screens darunter (Audit A5).
   */
  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', onKeydown, true);

  if (!prefersReducedMotion()) {
    void safeAnimate(
      panel,
      [{ transform: 'translate3d(0,100%,0)' }, { transform: 'translate3d(0,0,0)' }],
      { duration: MOTION.sheetMs, easing: MOTION.sheetEase, fill: 'both' }
    );
  }

  panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();

  return { el, close };
}

/**
 * Ja/Nein-Dialog — "Runde abbrechen?" (Roadmap M1.6).
 * Der abbrechende Knopf ist bewusst nicht der erste: Wer versehentlich hier landet,
 * soll nicht mit einem zweiten Reflex-Tap die Runde verlieren.
 */
export function confirmDialog(
  host: HTMLElement,
  options: { title: string; body: string; confirmLabel: string; dismissLabel: string; onConfirm: () => void }
): Sheet {
  return openSheet(host, {
    title: options.title,
    build: (body, close) => {
      const text = document.createElement('p');
      text.className = 'sheet__text';
      text.textContent = options.body;

      const actions = document.createElement('div');
      actions.className = 'sheet__actions';

      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'btn btn--primary';
      dismiss.textContent = options.dismissLabel;
      dismiss.addEventListener('click', close);

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'btn btn--danger';
      confirm.textContent = options.confirmLabel;
      confirm.addEventListener('click', () => {
        close();
        options.onConfirm();
      });

      actions.append(dismiss, confirm);
      body.append(text, actions);
    },
  });
}
