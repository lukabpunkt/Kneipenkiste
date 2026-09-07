import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'dev-dist/**',
      'playwright-report/**',
      'test-results/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    // CLAUDE.md: "Math.random in src/core/ verboten." Die Kiste faellt nur ueber
    // crypto.getRandomValues; alles andere laeuft ueber den seedbaren PRNG in rng.ts.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Math.random ist in src/core/ verboten — nutze core/rng.ts (crypto.getRandomValues / mulberry32).',
        },
      ],
      'no-restricted-globals': ['error'],
    },
  },
  {
    /*
     * Informationssicherheit ist Gameplay (CLAUDE.md): Screens sehen ausschliesslich
     * `publicView`. Diese Regel faengt den Zugriff schon beim Tippen ab;
     * `tests/unit/publicView.test.ts` prueft dieselbe Bedingung zusaetzlich ueber alle
     * Screen-Dateien, damit sie auch ohne Lint-Lauf gilt.
     */
    files: ['src/ui/**/*.ts', 'src/game/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          /*
           * `context.board` ist der **einzige** Weg zum privaten Board — wer ihn nicht
           * gehen kann, kommt an `mines` gar nicht heran. Die Regel greift damit eine
           * Ebene frueher als das eigentliche Verbot.
           *
           * Bewusst eng gefasst auf `context`: `stage.board` ist die PIXI-Buehne und
           * `replayCell.treasure` stammt aus `replayView()` — beides ist oeffentlich und
           * soll nicht mitgefangen werden.
           */
          selector: "MemberExpression[object.property.name='context'][property.name='board']",
          message:
            'Das private Board bleibt im Store — nutze fsm.view(), fsm.placeViewFor() oder fsm.replay() (CLAUDE.md, ADR-2).',
        },
        {
          selector: "MemberExpression[object.name='context'][property.name='board']",
          message:
            'Das private Board bleibt im Store — nutze fsm.view(), fsm.placeViewFor() oder fsm.replay() (CLAUDE.md, ADR-2).',
        },
        {
          // Zweites Netz, falls doch einmal ein Board hereingereicht wird.
          selector: 'MemberExpression[object.name=/[Bb]oard$/][property.name=/^(mines|treasure)$/]',
          message:
            'Screens und Buehne duerfen `board.mines` / `board.treasure` nicht lesen — nutze publicView()/replayView() aus core/board.ts.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.ts', '*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-restricted-syntax': 'off',
    },
  }
);
