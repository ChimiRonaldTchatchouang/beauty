import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, getRuntimeSettings } from '../config.js';

export interface PromptVariables {
  /** Opérateur de la SIM simulée. */
  operator: string;
  /** Numéro fictif de l'appelant. */
  callerNumber: string;
  /** Mode d'accès : 'direct' ou 'ussd_callback'. */
  accessMode: 'direct' | 'ussd_callback';
}

const PROMPT_PATH = resolve(config.promptsDir, 'system.fr.md');

/** Lit le fichier d'instructions (ou l'override runtime de la console). */
function loadTemplate(): string {
  const override = getRuntimeSettings().systemPromptOverride;
  if (override && override.trim().length > 0) return override;
  return readFileSync(PROMPT_PATH, 'utf8');
}

/** Date et heure courantes au fuseau du Cameroun, en français. */
function nowInTimezone(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: config.TIMEZONE,
  }).format(new Date());
}

const ACCESS_LABEL: Record<PromptVariables['accessMode'], string> = {
  direct: 'appel direct au numéro',
  ussd_callback: 'rappel déclenché depuis le menu USSD',
};

/** Construit les instructions système finales avec les variables injectées. */
export function buildSystemPrompt(vars: PromptVariables): string {
  const template = loadTemplate();
  return template
    .replaceAll('{{now}}', nowInTimezone())
    .replaceAll('{{operator}}', vars.operator)
    .replaceAll('{{callerNumber}}', vars.callerNumber)
    .replaceAll('{{accessMode}}', ACCESS_LABEL[vars.accessMode]);
}

/** Consigne d'accueil envoyée dès la connexion (l'appel vient d'être décroché). */
export const GREETING_INSTRUCTION =
  "L'appel vient d'être décroché. Accueille l'appelant maintenant, en précisant " +
  "que tu es un assistant automatique, avec la phrase d'accueil prévue.";
