/**
 * Emoji avatar pool for the players.
 *
 * Pure content: 24 clearly distinguishable emoji. Which avatar a player carries has no
 * influence whatsoever on the game — it exists so everyone recognises their own row quickly
 * while the phone is passed around.
 */

/** @type {string[]} */
export const AVATARS = [
  '🦄',
  '🐙',
  '🦊',
  '🐸',
  '🐼',
  '🦉',
  '🐝',
  '🦩',
  '🐨',
  '🦔',
  '🐧',
  '🦞',
  '🐢',
  '🦇',
  '🐳',
  '🦋',
  '🐹',
  '🦜',
  '🐊',
  '🦚',
  '🐌',
  '🦦',
  '🐷',
  '🦥',
];

/**
 * Picks an avatar that is not in use yet; falls back to the pool once all are taken.
 * @param {string[]} taken avatars already assigned
 * @param {number} seed index to start looking from, keeps the choice stable and testable
 * @returns {string}
 */
export function nextAvatar(taken, seed = 0) {
  const free = AVATARS.filter((avatar) => !taken.includes(avatar));
  const pool = free.length > 0 ? free : AVATARS;
  return pool[Math.abs(seed) % pool.length];
}
