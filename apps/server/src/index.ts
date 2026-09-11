import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { CallStartSchema } from '@nextiaa/shared';
import { config, getRuntimeSettings } from './config.js';
import { logger, loggerOptions } from './logger.js';
import { BrowserTransport } from './telephony/BrowserTransport.js';
import { CallSession } from './call/CallSession.js';
import { registerConfigRoutes } from './api/config.routes.js';

/**
 * Point d'entrée du serveur Nextiaa Voice.
 *
 * J1 : boucle audio complète. La route /ws/call attend un `call.start`, valide
 * le numéro composé, crée un BrowserTransport puis une CallSession reliée à
 * Gemini Live.
 */
async function main(): Promise<void> {
  const app = Fastify({ logger: loggerOptions });
  await app.register(websocket);
  await registerConfigRoutes(app);

  app.get('/health', async () => ({
    ok: true,
    service: 'nextiaa-voice-server',
    hasGeminiKey: config.hasGeminiKey,
    model: config.GEMINI_LIVE_MODEL,
    time: new Date().toISOString(),
  }));

  app.get('/ws/call', { websocket: true }, (socket: WebSocket) => {
    // Premier message attendu : call.start (JSON). On l'attend une seule fois,
    // avant d'attacher le transport (qui gère ensuite tous les messages).
    socket.once('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        safeSend(socket, { type: 'error', code: 'expected_start', message: 'Attendu : call.start' });
        socket.close();
        return;
      }
      let start;
      try {
        start = CallStartSchema.parse(JSON.parse(data.toString('utf8')));
      } catch {
        safeSend(socket, { type: 'error', code: 'bad_start', message: 'call.start invalide' });
        socket.close();
        return;
      }

      // Numéro non attribué (hors numéros de démo et code USSD).
      const isDemo = config.demoNumbers.includes(start.dialed);
      if (!isDemo) {
        safeSend(socket, { type: 'error', code: 'unassigned', message: "Ce numéro n'est pas attribué." });
        socket.close();
        return;
      }

      if (!config.hasGeminiKey) {
        safeSend(socket, {
          type: 'error',
          code: 'no_key',
          message: 'Clé Gemini absente côté serveur (.env GEMINI_API_KEY).',
        });
        socket.close();
        return;
      }

      const transport = new BrowserTransport(socket, {
        callerNumber: start.callerNumber,
        dialed: start.dialed,
      });

      const rt = getRuntimeSettings();
      const session = new CallSession(transport, {
        apiKey: config.GEMINI_API_KEY,
        model: config.GEMINI_LIVE_MODEL,
        voice: rt.voice,
        vadSilenceMs: rt.vadSilenceMs,
        maxCallMinutes: rt.maxCallMinutes,
        simOperator: start.simOperator,
        accessMode: start.accessMode,
        resumeHandle: start.resumeToken,
        // toolExecutor et onEnded seront branchés aux jalons J3/J4/J5.
      }, logger);

      void session.start();
    });
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

/** Envoi JSON robuste (avant que le transport ne prenne le relais). */
function safeSend(socket: WebSocket, event: { type: string; [k: string]: unknown }): void {
  try {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
  } catch {
    /* ignore */
  }
}

void main();
