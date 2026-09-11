import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port du serveur Node (doit correspondre à PORT dans .env, défaut 8787).
const SERVER_PORT = process.env.PORT ?? '8787';
const serverTarget = `http://localhost:${SERVER_PORT}`;

export default defineConfig({
  plugins: [react()],
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
