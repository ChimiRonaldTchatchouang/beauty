import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Fonctions pures (audio, outils, DB) : environnement Node suffit.
    environment: 'node',
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
    // better-sqlite3 est un module natif : ne pas le transformer.
    server: { deps: { external: ['better-sqlite3'] } },
  },
});
