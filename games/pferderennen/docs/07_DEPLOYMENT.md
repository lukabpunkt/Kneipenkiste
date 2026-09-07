# 07 – Git-Workflow, CI & Deployment

## 1. Repository

- Remote: `https://github.com/lukabpunkt/Pferderennen` (Branch `main`).
- Der Projektplan (`CLAUDE.md`, `PROGRESS.md`, `docs/`) wird **mit** ins Repo committet – er ist Teil des Projekts und die Referenz für jede Claude-Code-Session.
- Falls das Repo bei M0 noch leer ist: lokaler Ordner `/Users/lukabloemendal/Documents/Pferderennen` wird zum Repo-Root:
  ```bash
  cd /Users/lukabloemendal/Documents/Pferderennen
  git init -b main
  git remote add origin https://github.com/lukabpunkt/Pferderennen.git
  git add . && git commit -m "docs: add project plan"
  git push -u origin main
  ```
  Falls das Repo bereits Inhalte hat (z. B. README/LICENSE): erst `git pull origin main --allow-unrelated-histories`, Konflikte lösen, dann pushen.

## 2. Branching & Commits

- Solo-Projekt: direkt auf `main` nach bestandenem Audit ist erlaubt. Für riskante Umbauten (z. B. Portrait-Modus M4) Feature-Branch `feat/m4-portrait`, danach Fast-Forward-Merge.
- Conventional Commits, Englisch, Imperativ:
  - `feat(engine): add ornstein-uhlenbeck speed noise`
  - `fix(render): keep gallop phase continuous on speed change`
  - `test(fairness): add per-lane chi-square check`
  - `docs: update PROGRESS for M2`
  - `chore: complete M2`
- Jeder Meilenstein endet mit `chore: complete M<n>` und einem Push.

## 3. CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run audit:fairness -- --n=100000
      - name: E2E (ab M9)
        if: hashFiles('tests/e2e/**') != ''
        run: npx playwright install --with-deps chromium webkit && npm run e2e
```

Der Fairness-Audit ist ein **Pflicht-Gate**: Kein Merge/Deploy, wenn er rot ist.

## 4. Deployment auf GitHub Pages (`.github/workflows/deploy.yml`)

- Deploy-Quelle: **GitHub Actions** (nicht „Branch“), damit kein Build-Ordner nötig ist. Das Repo-Root wird als Artefakt hochgeladen (`actions/upload-pages-artifact` mit `path: .`), ausgenommen `node_modules`, `tests`, `docs` (optional, docs dürfen mit).
- Voraussetzung: In den Repo-Settings → Pages → Source = „GitHub Actions“ (einmalig durch den Nutzer; Claude Code weist in M9 darauf hin).
- Workflow läuft nur bei Push auf `main` und **nach** erfolgreichem CI-Job (`needs`).
- `.nojekyll` im Root, damit Unterstriche/Ordner nicht gefiltert werden.
- **Pfade:** Die Seite liegt unter `https://lukabpunkt.github.io/Pferderennen/`. Deshalb:
  - Alle Links/Importe **relativ** (`./src/main.js`, `./assets/...`), niemals `/src/...`.
  - Service-Worker mit `navigator.serviceWorker.register('./sw.js')`; Cache-Liste relativ zum SW-Scope.
  - `manifest.webmanifest`: `"start_url": "./"`, `"scope": "./"`.
- Nach dem ersten Deploy: URL in README und `PROGRESS.md` eintragen.

## 5. Versionierung & Releases

- SemVer. `package.json` `version`, `CHANGELOG.md` (Keep-a-Changelog-Format), Git-Tag `vX.Y.Z`, GitHub-Release mit Kurztext.
- Service-Worker-Cache-Name enthält die Version (`pferderennen-v1.0.0`), damit Updates zuverlässig ankommen.

## 6. Lokale Entwicklung

```bash
npm install
npm run dev          # http://localhost:5173 – auf dem Handy: http://<Mac-IP>:5173
npm test
npm run audit:fairness -- --n=20000     # schneller Check während des Tunings
npm run lint && npm run format
```

Für Handy-Tests im WLAN: `--host` ist im `dev`-Script gesetzt; iOS-Safari-Debugging über Mac-Safari → Entwickler-Menü.

## 7. Was der Nutzer einmalig selbst tun muss

1. GitHub-Repo existiert (ist der Fall).
2. Repo-Settings → Pages → Source: „GitHub Actions“ (vor M9).
3. Optional: Repo-Settings → Actions → Workflow permissions: „Read and write“ (für Pages-Deploy nötig, falls nicht Default).
