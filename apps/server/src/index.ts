import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Point d'entrée du serveur Nextiaa Voice.
 *
 * J0 : squelette qui démarre proprement (health check + route WS /ws/call
 * qui accepte la connexion). La logique d'appel (CallSession + Gemini Live)
 * est branchée au jalon J1.
 */
async function main(): Promise<void> {
  const app = Fastify({ loggerInstance: logger });

  await app.register(websocket);

  // Santé du serveur (utile pour le proxy Vite et les tests manuels).
  app.get('/health', async () => ({
    ok: true,
    service: 'nextiaa-voice-server',
    hasGeminiKey: config.hasGeminiKey,
    model: config.GEMINI_LIVE_MODEL,
    time: new Date().toISOString(),
  }));

  // Route d'appel WebSocket. Le pipeline complet arrive au J1 ;
  // pour l'instant on accepte la connexion et on ferme proprement.
  app.get('/ws/call', { websocket: true }, (socket) => {
    logger.info('Connexion /ws/call (squelette J0)');
    socket.on('message', () => {
      // J1 : router audio binaire et événements JSON vers CallSession.
    });
    socket.on('close', () => logger.info('Fermeture /ws/call'));
  });

  if (!config.hasGeminiKey) {
    logger.warn(
      'GEMINI_API_KEY absente : le serveur démarre mais les appels échoueront. ' +
        'Renseignez la clé du niveau gratuit dans .env (voir README).',
    );
  }

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`Serveur Nextiaa Voice à l'écoute sur http://localhost:${config.PORT}`);
  } catch (err) {
    logger.error(err, 'Échec du démarrage du serveur');
    process.exit(1);
  }
}

void main();
