/**
 * Vitest configuration.
 *
 * The engine is DOM-free, so all unit tests run in the fast Node environment. Per
 * docs/06_QA_AUDITS.md (A6) the coverage target for src/engine/** is >= 90 % of lines;
 * the threshold is switched on in M2 once the engine exists.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.js', 'src/state/**/*.js'],
      reporter: ['text', 'json-summary'],
    },
  },
});
