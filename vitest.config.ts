import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/core/**/*.ts'],
      /* Reine Typdatei — sie erzeugt kein Laufzeit-Statement, das man abdecken koennte. */
      exclude: ['src/core/types.ts'],
      thresholds: {
        // A0-Audit: core/ >= 95 % Branch-Coverage, FSM 100 %.
        'src/core/**/*.ts': { branches: 95, functions: 95, lines: 95, statements: 95 },
        'src/core/fsm.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
