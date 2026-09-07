/**
 * ESLint flat config.
 *
 * Beyond the recommended rules this config enforces the engine isolation rule from
 * docs/03_RACE_ENGINE.md (D2): src/engine/** must stay DOM-free and deterministic, so it
 * may not touch browser globals, wall-clock time, Math.random or any non-engine module.
 */
import js from '@eslint/js';
import globals from 'globals';

/** Browser globals that would make the simulation non-deterministic or DOM-dependent. */
const FORBIDDEN_ENGINE_GLOBALS = [
  { name: 'window', message: 'The engine must stay DOM-free (docs/03_RACE_ENGINE.md D2).' },
  { name: 'document', message: 'The engine must stay DOM-free (docs/03_RACE_ENGINE.md D2).' },
  { name: 'navigator', message: 'The engine must stay DOM-free (docs/03_RACE_ENGINE.md D2).' },
  { name: 'localStorage', message: 'The engine holds no persistent state.' },
  { name: 'Date', message: 'The engine is deterministic — never use wall-clock time.' },
  {
    name: 'performance',
    message: 'The engine is deterministic — never use wall-clock time.',
  },
  { name: 'crypto', message: 'Randomness comes only from the injected rng object.' },
];

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'dist/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // The engine is the fairness-critical core: deterministic, pure, DOM-free.
    files: ['src/engine/**/*.js'],
    rules: {
      'no-restricted-globals': ['error', ...FORBIDDEN_ENGINE_GLOBALS],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Randomness comes only from engine/rng.js (docs/03_RACE_ENGINE.md §10).',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'The engine is deterministic — never use wall-clock time.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/render/**', '**/ui/**', '**/state/**', '**/audio/**'],
              message:
                'The engine may only import from engine/ and data/ (docs/02_ARCHITECTURE.md).',
            },
            {
              group: ['**/data/horses.js'],
              message:
                'The engine knows no horse identities, only runner indices (docs/03_RACE_ENGINE.md §10).',
            },
          ],
        },
      ],
    },
  },
  {
    // The icon script drives a headless browser, so its page callbacks see browser globals too.
    files: ['tests/**/*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // The service worker has its own globals and runs outside any module graph.
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
  },
];
