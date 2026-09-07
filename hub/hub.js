/**
 * Launcher: liest games.json und rendert eine Karte pro Spiel.
 * Keine Abhängigkeiten, keine externen Requests, kein Service Worker —
 * der Launcher darf keinen SW registrieren, weil sein Scope sonst alle
 * Spiele überdecken würde (jedes Spiel bringt seinen eigenen mit).
 */
const list = document.getElementById('games');

try {
  const res = await fetch('./games.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`games.json: HTTP ${res.status}`);
  const catalog = await res.json();

  const claim = document.getElementById('claim');
  if (catalog.claim && claim) claim.textContent = catalog.claim;

  list.replaceChildren(...catalog.games.map(renderCard));
} catch (err) {
  console.error(err);
  const li = document.createElement('li');
  li.className = 'error';
  li.textContent = 'Die Spieleliste konnte nicht geladen werden. Bitte Seite neu laden.';
  list.replaceChildren(li);
} finally {
  list.setAttribute('aria-busy', 'false');
}

function renderCard(game) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.className = 'card';
  a.href = game.path;
  a.style.setProperty('--accent', game.accent);
  a.setAttribute('aria-label', `${game.title} spielen`);

  const icon = document.createElement('img');
  icon.className = 'icon';
  icon.src = game.icon;
  icon.alt = '';
  icon.width = 64;
  icon.height = 64;
  icon.loading = 'lazy';
  icon.decoding = 'async';

  const title = document.createElement('h3');
  title.className = 'title';
  title.append(game.title);
  const go = document.createElement('span');
  go.className = 'go';
  go.setAttribute('aria-hidden', 'true');
  go.textContent = '→';
  title.append(go);

  const tagline = document.createElement('p');
  tagline.className = 'tagline';
  tagline.textContent = game.tagline;

  const meta = document.createElement('p');
  meta.className = 'meta';
  const players = document.createElement('span');
  players.className = 'players';
  players.textContent = `${game.players} Personen`;
  meta.append(players);
  if (game.version) {
    const v = document.createElement('span');
    v.textContent = `v${game.version}`;
    meta.append(v);
  }

  a.append(icon, title, tagline, meta);
  li.append(a);
  return li;
}
