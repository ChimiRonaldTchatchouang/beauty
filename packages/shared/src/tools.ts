import { z } from 'zod';

/**
 * Schémas zod des ARGUMENTS de chaque outil (function calling).
 *
 * Ces schémas servent à valider côté serveur les arguments produits par le
 * modèle : un argument invalide renvoie une erreur propre au modèle, jamais
 * un plantage (voir ToolRouter).
 */

export const KB_CATEGORIES = ['operateurs', 'depannage', 'assurance', 'general'] as const;
export type KbCategory = (typeof KB_CATEGORIES)[number];

export const KB_OPERATORS = ['orange', 'mtn'] as const;
export type KbOperator = (typeof KB_OPERATORS)[number];

export const TICKET_PRIORITIES = ['haute', 'moyenne', 'normale'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

// ── search_knowledge_base ────────────────────────────────────
export const SearchKnowledgeBaseArgs = z.object({
  query: z.string().min(1),
  category: z.enum(KB_CATEGORIES).optional(),
  operator: z.enum(KB_OPERATORS).optional(),
});
export type SearchKnowledgeBaseArgs = z.infer<typeof SearchKnowledgeBaseArgs>;

// ── send_sms ─────────────────────────────────────────────────
export const SendSmsArgs = z.object({
  message: z.string().min(1).max(480),
});
export type SendSmsArgs = z.infer<typeof SendSmsArgs>;

// ── create_ticket ────────────────────────────────────────────
export const CreateTicketArgs = z.object({
  category: z.string().min(1),
  summary: z.string().min(1),
  priority: z.enum(TICKET_PRIORITIES),
});
export type CreateTicketArgs = z.infer<typeof CreateTicketArgs>;

// ── request_verification_code ────────────────────────────────
export const RequestVerificationCodeArgs = z.object({});
export type RequestVerificationCodeArgs = z.infer<typeof RequestVerificationCodeArgs>;

// ── verify_caller ────────────────────────────────────────────
export const VerifyCallerArgs = z.object({
  code: z.string().min(1),
});
export type VerifyCallerArgs = z.infer<typeof VerifyCallerArgs>;

// ── get_case_status ──────────────────────────────────────────
export const GetCaseStatusArgs = z.object({
  caseReference: z.string().min(1),
});
export type GetCaseStatusArgs = z.infer<typeof GetCaseStatusArgs>;

// ── transfer_to_human ────────────────────────────────────────
export const TransferToHumanArgs = z.object({
  reason: z.string().min(1),
  summary: z.string().min(1),
});
export type TransferToHumanArgs = z.infer<typeof TransferToHumanArgs>;

// ── end_call ─────────────────────────────────────────────────
export const EndCallArgs = z.object({
  reason: z.string().min(1),
});
export type EndCallArgs = z.infer<typeof EndCallArgs>;

/** Liste des noms d'outils exposés au modèle. */
export const TOOL_NAMES = [
  'search_knowledge_base',
  'send_sms',
  'create_ticket',
  'request_verification_code',
  'verify_caller',
  'get_case_status',
  'transfer_to_human',
  'end_call',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/** Map nom d'outil → schéma zod des arguments (source unique de validation). */
export const TOOL_ARG_SCHEMAS = {
  search_knowledge_base: SearchKnowledgeBaseArgs,
  send_sms: SendSmsArgs,
  create_ticket: CreateTicketArgs,
  request_verification_code: RequestVerificationCodeArgs,
  verify_caller: VerifyCallerArgs,
  get_case_status: GetCaseStatusArgs,
  transfer_to_human: TransferToHumanArgs,
  end_call: EndCallArgs,
} as const satisfies Record<ToolName, z.ZodTypeAny>;
