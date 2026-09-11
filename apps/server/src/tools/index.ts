import { z } from 'zod';
import type { FunctionDeclaration } from '@google/genai';
import { TOOL_ARG_SCHEMAS, type ToolName } from '@nextiaa/shared';
import type { Repository } from '../db/repository.js';
import type { ToolExecutor, ToolExecutionContext } from '../call/CallSession.js';
import { logger } from '../logger.js';
import { searchKnowledgeBase } from './knowledgeBase.js';
import { sendSms } from './sms.js';
import { VerificationStore } from './verification.js';

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
  private readonly verification = new VerificationStore();

  constructor(private readonly repo: Repository) {
    this.registerJ3();
    this.registerJ4();
  }

  /** Libère l'état de vérification en mémoire à la fin d'un appel. */
  onCallEnded(callId: string): void {
    this.verification.clear(callId);
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

  // ── Jalon J4 ───────────────────────────────────────────────
  private registerJ4(): void {
    this.register(
      'create_ticket',
      {
        description:
          "Crée un ticket (incident, demande technicien). À utiliser après confirmation de l'appelant. " +
          "Renvoie une référence du type NXV-2026-0001 à communiquer à l'appelant.",
        parametersJsonSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: "Catégorie du ticket (ex. 'depannage', 'facturation')." },
            summary: { type: 'string', description: "Résumé clair du problème." },
            priority: { type: 'string', enum: ['haute', 'moyenne', 'normale'], description: 'Priorité.' },
          },
          required: ['category', 'summary', 'priority'],
        },
      },
      (args, ctx) => {
        const a = args as z.infer<(typeof TOOL_ARG_SCHEMAS)['create_ticket']>;
        const ticket = this.repo.createTicket({
          reference: this.repo.nextTicketReference(),
          callId: ctx.callId,
          category: a.category,
          summary: a.summary,
          priority: a.priority,
        });
        return { ok: true, response: { reference: ticket.reference, priority: ticket.priority } };
      },
    );

    this.register(
      'request_verification_code',
      {
        description:
          "Génère un code de vérification à 4 chiffres et l'envoie par SMS au numéro de l'appelant. " +
          "À utiliser avant de consulter un dossier (get_case_status). Le code est valable 5 minutes.",
        parametersJsonSchema: { type: 'object', properties: {} },
      },
      (_args, ctx) => {
        const code = this.verification.generate(ctx.callId);
        sendSms(this.repo, ctx.transport, {
          message: `Nextiaa (démo) : votre code de vérification est ${code}. Valable 5 minutes. Ne le communiquez à personne.`,
        });
        return { ok: true, response: { sent: true } };
      },
    );

    this.register(
      'verify_caller',
      {
        description:
          "Vérifie le code de vérification donné par l'appelant (3 essais maximum). " +
          "Renvoie ok=true si le code est correct.",
        parametersJsonSchema: {
          type: 'object',
          properties: { code: { type: 'string', description: 'Le code à 4 chiffres dicté par l\'appelant.' } },
          required: ['code'],
        },
      },
      (args, ctx) => {
        const a = args as z.infer<(typeof TOOL_ARG_SCHEMAS)['verify_caller']>;
        const res = this.verification.verify(ctx.callId, a.code);
        return { ok: res.ok, response: { ...res } };
      },
    );

    this.register(
      'get_case_status',
      {
        description:
          "Donne l'état d'un dossier de sinistre (assurance). L'appelant DOIT être vérifié au préalable " +
          "(request_verification_code puis verify_caller), sinon l'accès est refusé.",
        parametersJsonSchema: {
          type: 'object',
          properties: { caseReference: { type: 'string', description: 'Référence du dossier, ex. SIN-2026-002.' } },
          required: ['caseReference'],
        },
      },
      (args, ctx) => {
        const a = args as z.infer<(typeof TOOL_ARG_SCHEMAS)['get_case_status']>;
        if (!this.verification.isVerified(ctx.callId)) {
          return { ok: false, response: { error: 'Appelant non vérifié. Vérifie l\'identité avant de consulter un dossier.' } };
        }
        const c = this.repo.getCase(a.caseReference.trim().toUpperCase());
        if (!c) return { ok: true, response: { found: false } };
        return {
          ok: true,
          response: { found: true, reference: c.reference, status: c.status, detail: c.detail, nextStep: c.next_step },
        };
      },
    );

    this.register(
      'transfer_to_human',
      {
        description:
          "Transfère l'appel vers un conseiller humain (simulé). Crée un ticket avec le résumé, puis annonce " +
          "à l'appelant qu'un conseiller le rappellera. À utiliser après confirmation.",
        parametersJsonSchema: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Motif du transfert.' },
            summary: { type: 'string', description: "Résumé de l'échange pour le conseiller." },
          },
          required: ['reason', 'summary'],
        },
      },
      (args, ctx) => {
        const a = args as z.infer<(typeof TOOL_ARG_SCHEMAS)['transfer_to_human']>;
        const ticket = this.repo.createTicket({
          reference: this.repo.nextTicketReference(),
          callId: ctx.callId,
          category: 'transfert',
          summary: `${a.reason} — ${a.summary}`,
          priority: 'haute',
        });
        ctx.setStatus('transferred');
        return { ok: true, response: { reference: ticket.reference, transferred: true } };
      },
    );

    this.register(
      'end_call',
      {
        description:
          "Termine proprement l'appel après le résumé et l'au revoir. Laisse l'audio en cours se terminer.",
        parametersJsonSchema: {
          type: 'object',
          properties: { reason: { type: 'string', description: 'Motif de fin (ex. demande de l\'appelant, résolu).' } },
          required: ['reason'],
        },
      },
      (args, ctx) => {
        const a = args as z.infer<(typeof TOOL_ARG_SCHEMAS)['end_call']>;
        ctx.requestHangup(`end_call:${a.reason}`);
        return { ok: true, response: { ending: true } };
      },
    );
  }
}
