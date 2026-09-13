import pino, { type LoggerOptions } from 'pino';
import { config } from './config.js';

/**
 * Options de journalisation partagées (pino).
 * Ne JAMAIS journaliser la clé API : elle est expressément expurgée.
 */
export const loggerOptions: LoggerOptions = {
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['GEMINI_API_KEY', 'DATABASE_URL', 'apiKey', 'connectionString', 'req.headers.authorization'],
    censor: '[expurgé]',
  },
  transport:
    config.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
};

/** Instance autonome (utilisée par la couche appel : CallSession, GeminiLiveClient). */
export const logger = pino(loggerOptions);

export type Logger = typeof logger;
