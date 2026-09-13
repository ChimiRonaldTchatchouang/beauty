import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import type { WebSocket } from 'ws';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CallStartSchema } from '@nextiaa/shared';
import { config, getRuntimeSettings } from './config.js';
import { logger, loggerOptions } from './logger.js';
import { BrowserTransport } from './telephony/BrowserTransport.js';
import { CallSession } from './call/CallSession.js';
import { registerConfigRoutes } from './api/config.routes.js';
import { registerConsoleRoutes } from './api/console.routes.js';
import { Repository } from './db/repository.js';
import { createPgPool } from './db/pool.js';
import { seed } from './db/seed.js';
import { ToolRouter } from './tools/index.js';

/**
 * Point d'entrée du serveur Nextiaa Voice.
 *
 * - Base PostgreSQL (Neon) via pg (schéma + données fictives au démarrage).
 * - /ws/call : boucle audio voix-à-voix (Gemini Live).
 * - En production, sert aussi le web buildé (déploiement tout-Render).
 */
async function main(): Promise<void> {
  const app = Fastify({ logger: loggerOptions });
  await app.register(websocket);

  // Base de données : ouverture, schéma, données fictives (si configurée).
  let repo: Repository | null = null;
  let toolRouter: ToolRouter | null = null;
  if (config.hasDatabase) {
    try {
      repo = new Repository(createPgPool(config.DATABASE_URL));
      await repo.init();
      await seed(repo);
      toolRouter = new ToolRouter(repo);
      logger.info('Base PostgreSQL (Neon) prête');
    } catch (err) {
      logger.error({ err }, 'Échec de connexion à la base PostgreSQL');
      repo = null;
    }
  } else {
    logger.warn('DATABASE_URL absente : le serveur démarre mais les appels échoueront (voir .env / Neon).');
  }

  await registerConfigRoutes(app);
  if (repo) await registerConsoleRoutes(app, repo);

  app.get('/health', async () => ({
    ok: true,
    service: 'nextiaa-voice-server',
    hasGeminiKey: config.hasGeminiKey,
    hasDatabase: repo !== null,
    model: config.GEMINI_LIVE_MODEL,
    time: new Date().toISOString(),
  }));

  app.get('/ws/call', { websocket: true }, (socket: WebSocket) => {
    // Premier message attendu : call.start (JSON), avant d'attacher le transport.
    socket.once('message', (data: Buffer, isBinary: boolean) => {
      void handleCallStart(socket, data, isBinary);
    });
  });

  async function handleCallStart(socket: WebSocket, data: Buffer, isBinary: boolean): Promise<void> {
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

    if (!config.demoNumbers.includes(start.dialed)) {
      safeSend(socket, { type: 'error', code: 'unassigned', message: "Ce numéro n'est pas attribué." });
      socket.close();
      return;
    }
    if (!config.hasGeminiKey) {
      safeSend(socket, { type: 'error', code: 'no_key', message: 'Clé Gemini absente côté serveur (.env GEMINI_API_KEY).' });
      socket.close();
      return;
    }
    if (!repo || !toolRouter) {
      safeSend(socket, { type: 'error', code: 'no_db', message: 'Base de données indisponible côté serveur.' });
      socket.close();
      return;
    }
    const activeRepo = repo;
    const activeTools = toolRouter;

    const transport = new BrowserTransport(socket, { callerNumber: start.callerNumber, dialed: start.dialed });

    try {
      await activeRepo.createCall({
        id: transport.callId,
        caller_number: start.callerNumber,
        dialed: start.dialed,
        sim_operator: start.simOperator,
        access_mode: start.accessMode,
        phone_quality: start.phoneQualityMode,
      });
    } catch (err) {
      logger.error({ err }, 'Échec createCall');
    }

    const rt = getRuntimeSettings();
    const session = new CallSession(
      transport,
      {
        apiKey: config.GEMINI_API_KEY,
        model: config.GEMINI_LIVE_MODEL,
        voice: rt.voice,
        vadSilenceMs: rt.vadSilenceMs,
        maxCallMinutes: rt.maxCallMinutes,
        simOperator: start.simOperator,
        accessMode: start.accessMode,
        resumeHandle: start.resumeToken,
        toolExecutor: activeTools,
        // Persistance en base (asynchrone, sans bloquer l'appel).
        onTranscriptFinal: (who, text, latencyMs) =>
          void activeRepo.addTurn(transport.callId, who, text, latencyMs).catch((e) => logger.error(e, 'addTurn')),
        onStatus: (status) => void activeRepo.setCallStatus(transport.callId, status).catch((e) => logger.error(e, 'setStatus')),
        onEnded: ({ callId, reason, durationSec, usage }) => {
          activeTools.onCallEnded(callId);
          void (async () => {
            try {
              const current = (await activeRepo.getCall(callId))?.status;
              const computed = reason === 'quota' || reason.startsWith('gemini') ? 'error' : 'ended';
              const status = current === 'transferred' || current === 'resolved' ? current : computed;
              await activeRepo.endCall(callId, durationSec, status, reason, usage ? JSON.stringify(usage) : null);
            } catch (e) {
              logger.error(e, 'endCall');
            }
          })();
        },
      },
      logger,
    );

    void session.start();
  }

  // Service du web buildé en production (déploiement tout-Render).
  if (existsSync(config.webDist)) {
    await app.register(fastifyStatic, { root: config.webDist, wildcard: false });
    // Fallback SPA : toute route non-API renvoie index.html.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/ws') && !req.url.startsWith('/health')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'not_found' });
    });
    logger.info({ dir: config.webDist }, 'Web buildé servi par le serveur');
  }

  if (!config.hasGeminiKey) {
    logger.warn('GEMINI_API_KEY absente : les appels échoueront (voir README).');
  }

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`Serveur Nextiaa Voice à l'écoute sur le port ${config.PORT}`);
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
