import pino from 'pino';
import { config } from './config.js';

/**
 * Journalisation structurée (pino).
 * Ne JAMAIS journaliser la clé API. On préfixe les logs d'appel par callId.
 */
export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['GEMINI_API_KEY', 'apiKey', 'req.headers.authorization'],
    censor: '[redacted]',
  },
  transport:
    config.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

export type Logger = typeof logger;
