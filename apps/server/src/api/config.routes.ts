import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

/**
 * Configuration PUBLIQUE exposée au navigateur (aucun secret).
 * Sert au téléphone simulé (numéros de démo, code USSD) et à la console.
 */
export async function registerConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/config', async () => ({
    demoNumbers: config.demoNumbers,
    ussdCode: config.USSD_CODE,
    maxCallMinutes: config.MAX_CALL_MINUTES,
  }));
}
