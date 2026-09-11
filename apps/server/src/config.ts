import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Chargement + validation de la configuration.
 *
 * On cherche un .env à la racine du monorepo (deux niveaux au-dessus de
 * apps/server) puis on valide les variables avec zod. Toute variable manquante
 * ou invalide provoque un arrêt clair au démarrage plutôt qu'un bug plus tard.
 */

// Racine du monorepo = .../nextiaa-voice
const MONOREPO_ROOT = resolve(process.cwd(), process.cwd().endsWith('apps/server') ? '../..' : '.');
const rootEnv = resolve(MONOREPO_ROOT, '.env');
if (existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
} else {
  loadEnv(); // fallback : .env dans le cwd
}

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_LIVE_MODEL: z.string().default('gemini-3.1-flash-live-preview'),
  GEMINI_VOICE: z.string().default('Kore'),
  VAD_SILENCE_MS: z.coerce.number().int().min(0).default(700),
  MAX_CALL_MINUTES: z.coerce.number().int().positive().default(10),
  DEMO_NUMBERS: z.string().default('8000'),
  USSD_CODE: z.string().default('#136#'),
  CONSOLE_PASSWORD: z.string().default('change-moi'),
  PORT: z.coerce.number().int().positive().default(8787),
  TIMEZONE: z.string().default('Africa/Douala'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = EnvSchema.parse(process.env);

export const config = {
  ...parsed,
  monorepoRoot: MONOREPO_ROOT,
  /** Chemin du fichier SQLite local. */
  dbPath: resolve(MONOREPO_ROOT, 'data', 'nextiaa-voice.db'),
  /** Dossier des fiches de la base de connaissances (import initial). */
  knowledgeDir: resolve(MONOREPO_ROOT, 'data', 'knowledge'),
  /** Dossier des prompts (instructions système). */
  promptsDir: resolve(MONOREPO_ROOT, 'apps', 'server', 'prompts'),
  /** Numéros de démo (liste dérivée de DEMO_NUMBERS). */
  demoNumbers: parsed.DEMO_NUMBERS.split(',').map((n) => n.trim()).filter(Boolean),
  /** true si une clé Gemini est présente (permet de démarrer la démo sans clé). */
  hasGeminiKey: parsed.GEMINI_API_KEY.trim().length > 0,
} as const;

export type AppConfig = typeof config;

// Réglages modifiables à chaud depuis la console (s'appliquent au prochain appel).
export interface RuntimeSettings {
  voice: string;
  vadSilenceMs: number;
  maxCallMinutes: number;
  systemPromptOverride: string | null;
}

const runtimeSettings: RuntimeSettings = {
  voice: config.GEMINI_VOICE,
  vadSilenceMs: config.VAD_SILENCE_MS,
  maxCallMinutes: config.MAX_CALL_MINUTES,
  systemPromptOverride: null,
};

export function getRuntimeSettings(): RuntimeSettings {
  return { ...runtimeSettings };
}

export function updateRuntimeSettings(patch: Partial<RuntimeSettings>): RuntimeSettings {
  Object.assign(runtimeSettings, patch);
  return { ...runtimeSettings };
}
