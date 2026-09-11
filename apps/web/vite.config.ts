import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { relative } from 'node:path';

// Port du serveur Node (doit correspondre à PORT dans .env, défaut 8787).
const SERVER_PORT = process.env.PORT ?? '8787';
const serverTarget = `http://localhost:${SERVER_PORT}`;

/**
 * Plugin `?worklet-url` : charge un module TS comme AudioWorklet.
 * - En dev (serve) : renvoie l'URL servie par Vite, qui transpile le .ts à la volée.
 * - En build : émet le module comme chunk JS séparé et renvoie son URL finale.
 * Nécessaire car un simple `new URL('./x.ts', import.meta.url)` n'est PAS
 * transpilé par Vite hors d'un `new Worker(...)`.
 */
function workletUrlPlugin(): Plugin {
  const SUFFIX = '?worklet-url';
  let cfg: ResolvedConfig;
  return {
    name: 'nextiaa-worklet-url',
    configResolved(resolved) {
      cfg = resolved;
    },
    async resolveId(id, importer) {
      if (!id.endsWith(SUFFIX)) return null;
      const resolved = await this.resolve(id.slice(0, -SUFFIX.length), importer, { skipSelf: true });
      return resolved ? resolved.id + SUFFIX : null;
    },
    load(id) {
      if (!id.endsWith(SUFFIX)) return null;
      const clean = id.slice(0, -SUFFIX.length);
      if (cfg.command === 'serve') {
        // Dev : URL relative à la racine, transpilée à la volée par Vite.
        const url = '/' + relative(cfg.root, clean).split('\\').join('/');
        return `export default ${JSON.stringify(url)};`;
      }
      // Build : chunk JS séparé, transpilé par Rollup.
      const ref = this.emitFile({ type: 'chunk', id: clean });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), workletUrlPlugin()],
  server: {
    port: 5173,
    // Le navigateur parle au serveur Node via ces proxys : la clé API reste
    // côté serveur, jamais dans le code du navigateur.
    proxy: {
      '/api': { target: serverTarget, changeOrigin: true },
      '/ws': { target: serverTarget, ws: true, changeOrigin: true },
      '/health': { target: serverTarget, changeOrigin: true },
    },
  },
});
