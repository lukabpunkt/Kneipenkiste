/**
 * Fullscreen for the race, on phones.
 *
 * A race is the one moment in this game where the browser's own chrome is in the way: the phone
 * is lying in the middle of a table, six people are watching it, and a third of the screen is an
 * address bar. So the race takes the whole screen and gives it back when it is over.
 *
 * Two things this has to respect:
 *
 * 1. Entering fullscreen only works from inside a user gesture, which is why `enter()` is called
 *    from the "Rennen starten" click handler and not from the race screen's mount — by then the
 *    gesture is over and the browser refuses.
 * 2. It can fail for reasons that are none of our business: a permissions policy, a browser that
 *    has it switched off, or iOS on an iPhone, where the API does not exist at all. A race that
 *    runs in a normal window is a missing flourish, not a broken game, so every path here fails
 *    quietly.
 *
 * Leaving is deliberately tied to the race screen going away rather than to the race finishing.
 * That way skipping, navigating back and a hand-typed URL all end the same way as a won race.
 */

/** Touch device: a phone or tablet, which is where the browser chrome actually costs screen. */
const isHandheld = () =>
  window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true;

/**
 * Whether the browser will let us try at all.
 *
 * `document.fullscreenEnabled` is false inside an iframe without the right permissions policy,
 * and on iPhone Safari the whole API is simply absent — iPad has it, iPhone never has.
 *
 * @returns {boolean}
 */
function available() {
  const root = document.documentElement;
  return Boolean(
    (document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
    (root.requestFullscreen || root.webkitRequestFullscreen),
  );
}

/** @returns {boolean} */
const isFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

/**
 * Takes the whole screen for the race. Must be called synchronously from a user gesture.
 *
 * Does nothing on a desktop: there the window is already large and taking it over uninvited is
 * startling rather than helpful.
 */
export function enter() {
  if (!isHandheld() || !available() || isFullscreen()) return;
  const root = document.documentElement;
  try {
    // Older WebKit returns undefined rather than a promise, hence the optional chain.
    const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
    // `navigationUI: 'hide'` is a hint; browsers that do not know it ignore the whole options
    // object, so it is passed rather than relied on.
    request.call(root, { navigationUI: 'hide' })?.catch(() => {});
  } catch {
    // Refused. The race simply runs in the window.
  }
}

/** Gives the screen back. Allowed without a gesture, unlike entering. */
export function exit() {
  if (!isFullscreen()) return;
  try {
    const release = document.exitFullscreen ?? document.webkitExitFullscreen;
    release?.call(document)?.catch(() => {});
  } catch {
    // Already gone, or the user left it themselves.
  }
}
