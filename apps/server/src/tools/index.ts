import { z } from 'zod';
import type { FunctionDeclaration } from '@google/genai';
import { TOOL_ARG_SCHEMAS, type ToolName } from '@nextiaa/shared';
import type { Repository } from '../db/repository.js';
import type { ToolExecutor, ToolExecutionContext } from '../call/CallSession.js';
import { logger } from '../logger.js';
import { searchKnowledgeBase } from './knowledgeBase.js';
import { sendSms } from './sms.js';

type ToolResult = { ok: boolean; response: Record<string, unknown> };
type Handler = (args: Record<string, unknown>, ctx: ToolExecutionContext) => ToolResult | Promise<ToolResult>;

interface RegisteredTool {
  declaration: FunctionDeclaration;
  handler: Handler;
}

/**
 * Routeur d'outils : valide chaque argument avec zod (@nextiaa/shared), exécute
 * l'outil, journalise et persiste l'appel. Un argument invalide renvoie une
 * erreur PROPRE au modèle (jamais un plantage).
 *
 * Les outils sont enregistrés par jalon : J3 (search_knowledge_base, send_sms),
 * J4 (tickets, vérification, dossiers, transfert, fin d'appel).
 */
export class ToolRouter implements ToolExecutor {
  private readonly tools = new Map<ToolName, RegisteredTool>();

  constructor(private readonly repo: Repository) {
    this.registerJ3();
  }

  get declarations(): FunctionDeclaration[] {
    return [...this.tools.values()].map((t) => t.declaration);
  }

  register(name: ToolName, declaration: Omit<FunctionDeclaration, 'name'>, handler: Handler): void {
    this.tools.set(name, { declaration: { name, ...declaration }, handler });
  }

  async execute(name: string, rawArgs: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
    const tool = this.tools.get(name as ToolName);
    if (!tool) {
      return this.persist(ctx.callId, name, rawArgs, { ok: false, response: { error: `Outil inconnu : ${name}` } });
    }

    // Validation zod des arguments.
    const schema = TOOL_ARG_SCHEMAS[name as ToolName];
    const parsed = schema.safeParse(rawArgs);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join('.') || 'argument'} : ${i.message}`).join(' ; ');
      logger.warn({ callId: ctx.callId, name, message }, 'Arguments d\'outil invalides');
      return this.persist(ctx.callId, name, rawArgs, {
        ok: false,
        response: { error: `Arguments invalides (${message}). Corrige et réessaie.` },
      });
    }

    try {
      const result = await tool.handler(parsed.data as Record<string, unknown>, ctx);
      return this.persist(ctx.callId, name, parsed.data as Record<string, unknown>, result);
    } catch (err) {
      logger.error({ callId: ctx.callId, name, err }, 'Erreur exécution outil');
      return this.persist(ctx.callId, name, rawArgs, { ok: false, response: { error: 'Erreur interne de l\'outil.' } });
    }
  }

  private persist(callId: string, name: string, args: Record<string, unknown>, result: ToolResult): ToolResult {
    try {
      this.repo.addToolCall(callId, name, JSON.stringify(args), result.ok, JSON.stringify(result.response));
    } catch (err) {
      logger.error({ callId, name, err }, 'Échec persistance tool_call');
    }
    return result;
  }

  // ── Jalon J3 ───────────────────────────────────────────────
  private registerJ3(): void {
    this.register(
      'search_knowledge_base',
      {
        description:
          "Recherche une information VÉRIFIÉE dans la base de connaissances (codes, tarifs, procédures, " +
          "informations opérateurs/dépannage/assurance/général). À appeler OBLIGATOIREMENT avant de donner " +
          "un code, un prix, une procédure ou un état. Renvoie jusqu'à 3 fiches vérifiées, ou found=false si " +
          "aucune information vérifiée n'existe (dans ce cas, ne rien inventer).",
        parametersJsonSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'La question ou les mots-clés de recherche.' },
            category: {
              type: 'string',
              enum: ['operateurs', 'depannage', 'assurance', 'general'],
              description: 'Catégorie optionnelle pour affiner.',
            },
            operator: { type: 'string', enum: ['orange', 'mtn'], description: 'Opérateur optionnel.' },
          },
          required: ['query'],
        },
      },
      (args) => {
        const result = searchKnowledgeBase(this.repo, args as z.infer<(typeof TOOL_ARG_SCHEMAS)['search_knowledge_base']>);
        return { ok: true, response: result as unknown as Record<string, unknown> };
      },
    );

    this.register(
      'send_sms',
      {
        description:
          "Envoie un SMS récapitulatif au numéro de l'appelant (480 caractères max). À n'appeler QU'APRÈS " +
          "avoir demandé et obtenu la confirmation de l'appelant.",
        parametersJsonSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Le texte du SMS (480 caractères max).' },
          },
          required: ['message'],
        },
      },
      (args, ctx) => {
        const result = sendSms(this.repo, ctx.transport, args as z.infer<(typeof TOOL_ARG_SCHEMAS)['send_sms']>);
        return { ok: result.ok, response: result as unknown as Record<string, unknown> };
      },
    );
  }
}
