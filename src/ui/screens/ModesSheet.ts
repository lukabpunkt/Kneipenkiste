/**
 * Modi-Anleitung — was sich in jedem Modus **genau** ändert.
 *
 * Die Lobby zeigt pro Modus einen Satz. Der sagt, worum es geht, aber nicht, was passiert:
 * Trinkt der Maulwurf weniger? Kann ich meinen Schwur zurücknehmen? Wer zahlt, wenn der
 * Kronzeuge auspackt? Genau diese Fragen stellt man sich beim ersten Mal am Tisch — und
 * wer sie nicht beantwortet bekommt, spielt vorsichtiger, als das Spiel es verdient.
 *
 * Deshalb ein eigenes Blatt statt längerer Zeilen in der Lobby: Dort will man tippen,
 * hier nachschlagen (GDD Pfeiler 4, Zero Friction). Erreichbar von der Lobby und aus den
 * Regeln.
 *
 * Reihenfolge und Inhalte kommen aus `MODE_IDS` und der i18n — wer einen Modus ergänzt,
 * bekommt hier automatisch einen Abschnitt und merkt am fehlenden Text, dass er ihn noch
 * schreiben muss.
 */

import { MODE_IDS, type ModeId, type Settings } from '@/config/rules';
import { t, tList } from '@/core/i18n';
import { openSheet, type SheetHandle } from '@/ui/components/sheet';

export function createModesSheet(settings?: Settings): SheetHandle {
  const content = document.createElement('div');
  content.className = 'modeGuide';

  const intro = document.createElement('p');
  intro.className = 'modeGuide__intro';
  intro.textContent = t('modeGuide.intro');
  content.append(intro);

  for (const id of MODE_IDS) {
    content.append(section(id, settings?.modes[id] ?? false));
  }

  return openSheet({
    title: t('modeGuide.headline'),
    content,
    className: 'sheet__panel--tall',
  });
}

function section(id: ModeId, active: boolean): HTMLElement {
  const article = document.createElement('article');
  article.className = 'modeGuide__mode';
  /*
   * Der gerade eingeschaltete Modus wird hervorgehoben. Wer das Blatt aus der Lobby
   * oeffnet, hat meist genau einen im Kopf — und findet ihn dann, ohne zu suchen.
   */
  article.classList.toggle('is-active', active);

  const title = document.createElement('h3');
  title.className = 'modeGuide__title';
  title.textContent = t(`modeGuide.${id}.title`);
  article.append(title);

  const list = document.createElement('ul');
  list.className = 'modeGuide__lines';
  for (const line of tList(`modeGuide.${id}.lines`)) {
    const item = document.createElement('li');
    item.textContent = line;
    list.append(item);
  }
  article.append(list);

  /*
   * Die Fussnote ist der Satz, den man beim ersten Spielen falsch erwartet — die Ausnahme,
   * die Streit am Tisch verhindert. Deshalb steht sie abgesetzt und nicht in der Liste.
   */
  const note = t(`modeGuide.${id}.note`);
  if (!note.startsWith('[missing:')) {
    const hint = document.createElement('p');
    hint.className = 'modeGuide__note';
    hint.textContent = note;
    article.append(hint);
  }

  return article;
}
