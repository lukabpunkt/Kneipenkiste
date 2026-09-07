/**
 * Tiny DOM helpers shared by all screens and components.
 *
 * Deliberately no template engine and no innerHTML: text always goes through textContent, so a
 * player name can never turn into markup (docs/02_ARCHITECTURE.md §10).
 */

/**
 * Creates an element.
 * @param {string} tag
 * @param {object} [options]
 * @param {string} [options.className]
 * @param {string} [options.text] set via textContent, never parsed as HTML
 * @param {Record<string, string|number|boolean|null|undefined>} [options.attrs]
 * @param {Record<string, string>} [options.vars] CSS custom properties, e.g. {'--horse-color': '#f00'}
 * @param {Record<string, (event: Event) => void>} [options.on] event listeners
 * @param {(Node|string|null|false|undefined)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  const { className, text, attrs, vars, on } = options;

  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);

  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }

  for (const [name, value] of Object.entries(vars ?? {})) {
    node.style.setProperty(name, value);
  }

  for (const [type, handler] of Object.entries(on ?? {})) {
    node.addEventListener(type, handler);
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }

  return node;
}

/**
 * Shorthand for a text node wrapped in a span.
 * @param {string} text
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function span(text, className) {
  return el('span', { className, text });
}

/**
 * Registers listeners and returns one function that removes all of them again.
 * Screens use this in unmount() so no listener survives a screen change (audit A6).
 * @param {[EventTarget, string, EventListener, (boolean|AddEventListenerOptions)?][]} entries
 * @returns {() => void}
 */
export function listen(entries) {
  for (const [target, type, handler, options] of entries) {
    target.addEventListener(type, handler, options);
  }
  return () => {
    for (const [target, type, handler, options] of entries) {
      target.removeEventListener(type, handler, options);
    }
  };
}

/**
 * Moves keyboard focus to an element without scrolling the page underneath it.
 * @param {HTMLElement|null} node
 */
export function focus(node) {
  if (node) node.focus({ preventScroll: true });
}
