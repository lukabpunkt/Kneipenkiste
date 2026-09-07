# Release-Audit v1.0.0

**Datum:** 2026-09-02 · **Commit:** siehe Tag `v1.0.0` · **Audit:** A7 nach `06_QA_AUDITS.md`

Dieses Dokument ist der Nachweis, dass die Version, die live geht, jede Prüfung bestanden hat,
die sich der Plan selbst gegeben hat. Es fasst zusammen; die ausführlichen Protokolle mit den
gefundenen Fehlern und ihren Ursachen stehen in `PROGRESS.md`.

## 1. A1–A6 in dieser Version

| Audit | Zuletzt gelaufen | Ergebnis | Kurzfassung |
| --- | --- | --- | --- |
| **A1** – UI/UX | M7 (Re-Run des Design-Teils in M6) | **bestanden** | 6 Taps bis zum ersten Rennen, Hash-Guards greifen, nur Tokens, keine Schrift < 14 px |
| **A2** – Fairness & Spannung | M9 (N = 1.000.000) | **bestanden** | siehe Abschnitt 3 |
| **A3** – Visual & Animation | M6 (Polish-Teil; Events M5, Portrait M4, Landscape M3) | **bestanden** | Gallop-Phase kontinuierlich, kein lineares Tweening, Fotofinish löst sich auf |
| **A4** – Barrierefreiheit | M8 (vollständig) | **bestanden** | Lighthouse A11y **100**, 0 Kontrast- und 0 Tap-Target-Verstöße, Tastatur-Flow komplett |
| **A5** – Performance | M8 (vollständig) | **bestanden** | Lighthouse Performance **92**, TBT **0 ms**, CLS **0**, kein verworfener Frame im Rennen |
| **A6** – Code | M7 | **bestanden** | keine Zyklen, Engine-Coverage 98 %, Reducer/Payout 100 % Branches, 1 begründete Ausnahme |

Insgesamt haben diese Audits über die neun Meilensteine **26 echte Fehler** gefunden und behoben –
von der Giraffenhals-Animation in M3 über das gerissene Ladebudget in M5 bis zum fehlenden LCP in
M8. Die Liste mit Ursachen steht in `PROGRESS.md` unter „Audit-Protokoll".

## 2. E2E-Tests

`npm run e2e` – Playwright, 8 Tests (4 Szenarien × 2 Browser), beide im Handy-Viewport:

| Szenario | Chromium (Pixel 7) | WebKit (iPhone 13) |
| --- | --- | --- |
| Leerer Start → 3 Spieler → 3 Wetten → Rennen → Ergebnis → nächstes Rennen | ✅ | ✅ |
| Gleicher Seed ergibt denselben Sieger (zwei getrennte Browser-Kontexte) | ✅ | ✅ |
| Einstellungen überleben einen Reload | ✅ | ✅ |
| `#/race` von Hand getippt landet nicht auf einem toten Screen | ✅ | ✅ |

Das Rennen läuft dabei mit `?seed=42&debugSkip=1`, damit kein Test dreißig Sekunden Pferden
zusieht. Der Determinismus-Test benutzt bewusst zwei frische Kontexte: Der Seed soll das Rennen
entscheiden, sonst nichts.

## 3. Fairness: 1.400.000 Rennen

Voller Bericht: [`fairness-v1.0.json`](./fairness-v1.0.json) – 1.000.000 Hauptrennen plus
4 × 100.000 Vergleichsrennen für Chaos-Level und Renndauer.

| Kriterium | Ziel | Gemessen |
| --- | --- | --- |
| **F1** Siege je Pferd | alle in [0,1607, 0,1727] | **0,1662 – 0,1673**, max. Abweichung 0,0006 · χ² = 4,49, p = 0,48 |
| **F2** Siege je Bahn | uniform | 0,1663 – 0,1671 · χ² = 3,08, p = 0,69 |
| **F3** Plätze 2–6 je Pferd | uniform | p = 0,04 – 0,98, alle über 0,001 |
| **F4** Events je Pferd | uniform, ≤ 2 je Läufer, Fenster 8–95 % | χ² = 4,95, p = 0,42 · Maximum 2 · 0 Verstöße |
| **F5** Jedes Rennen erreicht ein Ergebnis | 0 Ausfälle | **0** |
| **F1** je Chaos-Level und Renndauer | uniform | p = 0,25 – 0,77 |
| **D1** Determinismus | gleicher Seed → gleiches JSON, unabhängig von der Worker-Zahl | ✅ |

Der ideale Anteil ist 1/6 = 0,16667. Der größte gemessene Ausreißer über eine Million Rennen liegt
**0,0006 davon entfernt** – erlaubt wären 0,0060.

**Spannung:**

| Kriterium | Ziel | Gemessen |
| --- | --- | --- |
| S1 Führender bei 50 % gewinnt | 25 – 40 % | **31,1 %** |
| S2 Führender bei 80 % gewinnt | 45 – 65 % | **49,0 %** |
| S3 Aus der hinteren Feldhälfte bei Halbzeit | ≥ 20 % | **27,2 %** |
| S4 Führungswechsel je Rennen | ≥ 4 | **11,9** |
| S5 Fotofinish-Anteil | 25 – 45 % | **39,7 %** |
| S6 95. Perzentil Abstand 1. zu 6. | < 150 Units | **132** |

S3 und S6 sind in M2 nach Messung angepasst worden; die Begründung mit den Messkurven steht in
`PROGRESS.md` unter „Zwei Kriterien mussten geändert werden".

## 4. Browser-Matrix

| Browser | Status | Anmerkung |
| --- | --- | --- |
| Desktop Chrome | ✅ geprüft | Entwicklung und alle manuellen Durchläufe |
| Chromium mobile (Pixel 7) | ✅ automatisiert | E2E, jeder Push |
| WebKit mobile (iPhone 13) | ✅ automatisiert | E2E, jeder Push |
| Desktop Firefox | ⏳ offen | vom Nutzer zu prüfen |
| Desktop Safari | ⏳ offen | vom Nutzer zu prüfen |
| iOS Safari (echtes Gerät) | ⏳ offen | inkl. „Zum Home-Bildschirm" und Flugmodus |
| Android Chrome (echtes Gerät) | ⏳ offen | dito |

WebKit deckt die Safari-Engine automatisiert ab; was ein echtes Gerät zusätzlich zeigt, sind
Touch-Verhalten, `100dvh` unter der Adressleiste und die Installation auf dem Homescreen. Das
bleibt der Nutzer-Test.

## 5. PWA und Offline

| Prüfpunkt | Ergebnis |
| --- | --- |
| Manifest vollständig, Icons 192 / 512 / maskable | ✅ prozedural aus `render/horsePortrait.js` |
| Service Worker cache-first mit Version | ✅ `pferderennen-v1.0.0`, 78 Dateien |
| **Update-Mechanismus getestet** | ✅ Version hochgezählt → `updatefound` → `installed` → Toast „Neue Version – neu laden." → Reload aktiviert sie → alter Cache gelöscht |
| Flugmodus nach erstem Laden | ✅ Server gestoppt, komplettes Rennen bis zum Ergebnis gespielt |
| Precache-Liste kann nicht veralten | ✅ generiert, in der CI mit `git diff --exit-code` abgesichert |

## 6. Debug-Modus

| Prüfpunkt | Ergebnis |
| --- | --- |
| Kein Debug ohne `?debug=1` | ✅ Panel, Tastenkürzel, `window.__race` und der Pfad-Op-Zähler hängen alle an `debug.enabled` |
| `debugSkip` im Produktions-Flow unsichtbar | ✅ der Schalter erscheint in den Einstellungen nur mit `?debug=1`; die Einstellung selbst bleibt (GDD §6) |
| Toter Debug-Code | ✅ `debugSeed` war nie verdrahtet und ist entfernt |

## 7. Verantwortung und Alkoholfrei-Modus

| Prüfpunkt | Ergebnis |
| --- | --- |
| Hinweis im Regeln-Screen | ✅ „Trinkt verantwortungsvoll. Wasser ist auch ein Getränk. Wer fährt, spielt im Alkoholfrei-Modus um Punkte – der macht genauso viel Spaß." |
| Alkoholfrei-Modus vollständig | ✅ 0 hartkodierte „Schluck" außerhalb von `ui/strings.js` und `data/` – auch die Einstellungs-Hinweise folgen mit |
| Maximaleinsatz 10 | ✅ `BETTING.maxSips`, keine Funktion, die Einsätze wachsen lässt |

## 8. Offen

Alles, was nur ein Mensch beurteilen kann, und damit der Inhalt des ersten Playtests:

- Der echte Spieleabend – Protokoll in `docs/PLAYTEST_TEMPLATE.md`.
- „Zum Home-Bildschirm" auf iOS und Android, danach Flugmodus.
- Firefox und Safari auf dem Desktop.
- Deuteranopie-Simulation im DevTools-Rendering-Tab.
- FPS-Messung auf einem echten Mittelklasse-Handy mit `?debug=1`.
