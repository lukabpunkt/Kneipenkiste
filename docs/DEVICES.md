# Gerätematrix

> Was getestet ist, womit, und was nur ein echtes Gerät beantworten kann.

## Referenzgeräte (CLAUDE.md)

| Gerät | Browser | Wie getestet | Ziel | Stand |
|---|---|---|---|---|
| Pixel 4a / 5 | Chrome | Playwright-Emulation (Chromium), 393 × 727 | 60 fps | p50 **16,7 ms**, p95 17,7 ms, 3 Draw-Calls |
| iPhone 11 / 12 | Safari | Playwright-Emulation (WebKit), 390 × 664 | 60 fps | Flow und Sequenzen grün; Frame-Zeiten ⏳ echtes Gerät |

Die Emulation prüft Layout, Interaktion, Hit-Tests und Abläufe zuverlässig. Sie prüft
**nicht** die tatsächliche GPU-Leistung, das Verhalten unter Akkusparmodus und ob der Ton
über einen echten Handylautsprecher trägt. Dafür braucht es Geräte.

## Sekundär

| Gerät | Browser | Stand |
|---|---|---|
| iPad | Safari | ⏳ ungetestet — Portrait-Frame sollte greifen, Trefferflächen werden größer |
| Desktop | Chrome / Firefox / Safari | Läuft im Portrait-Frame; Lighthouse 99/100/100 gegen Chromium |

## Was in der Emulation abgesichert ist

- **Layout:** kein horizontales Scrollen, Safe-Areas, Portrait-Frame ab 768 px
- **Trefferflächen:** jeder Koffer ≥ 56 px, gemessen im engsten Fall (7 Koffer)
- **Interaktion:** 50 von 50 Taps landen beim richtigen Koffer; das DOM-HUD blockiert nichts
- **Ablauf:** drei vollständige Runden inklusive Bestechung und Diplomat, auf beiden Engines
- **Zugänglichkeit:** Lighthouse 100, Kontrast 22/22, Tastatur-Bedienung der Koffer
- **PWA:** Manifest, Service Worker, Icons
- **Ausdauer:** Heap flach über 30 s, Title-Loop ohne nachwachsende Elemente

## Was nur ein echtes Gerät beantwortet

- [ ] **Frame-Zeiten unter echter Last** — iPhone 11 und Pixel 4a sind langsamer als der
      Testrechner. Der Low-Effects-Modus greift automatisch, aber ob er greift, wenn er
      soll, zeigt erst das Gerät.
- [ ] **Ton auf dem Handylautsprecher** — die Cues sind für kleine Membranen und eine laute
      Runde ausgelegt. Ob sie tragen, hört man nicht am Schreibtisch.
- [ ] **Installation als PWA** und Start im Flugmodus
- [ ] **Wake-Lock**: bleibt der Bildschirm während des Verhörs an?
- [ ] **Haptik**: `navigator.vibrate` gibt es auf iOS nicht — dort muss das Spiel ohne
      auskommen, und das tut es, aber es soll sich auch so anfühlen
- [ ] **Akkusparmodus**: Safari drosselt dann Animationen; die Sequenzen sollen trotzdem
      zu Ende laufen

## Bekannte Umgebungs-Eigenheiten

- **Lokale Testläufe:** Auf einem Rechner mit 8 GB beendet macOS den Preview-Server
  während langer E2E-Läufe per SIGKILL. In der CI mit mehr Speicher läuft alles am Stück.

  Was lokal hält, ist ein statischer Server auf dem Build statt `vite preview` — er hat
  Sieben-Minuten-Läufe überstanden, wo der Preview nach anderthalb Minuten weg war:

  ```
  npm run build
  mkdir -p /tmp/zoll-serve && ln -sf "$PWD/dist" /tmp/zoll-serve/Zoll
  (cd /tmp/zoll-serve && python3 -m http.server 4187 --bind 127.0.0.1 &)
  PREVIEW_PORT=4187 npx playwright test tests/e2e/flow.spec.ts --workers=1
  ```

  Ein Unterschied bleibt: Der Python-Server komprimiert nicht. Lighthouse misst dagegen
  **94** statt 99 — das ist die fehlende Kompression, nicht die App. Für den
  Lighthouse-Lauf also `npm run preview` nehmen, der ist kurz genug.
- **Software-Rendering:** Ohne GPU rendert Chromium per SwiftShader. Der Perf-Test erkennt
  das und bewertet Frame-Zeiten dann nicht — Draw-Calls, JS-Zeit und Heap trotzdem.
