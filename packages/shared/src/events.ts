import { z } from 'zod';

/**
 * Protocole WebSocket navigateur ⇄ serveur (route /ws/call).
 *
 * - Les frames BINAIRES transportent l'audio PCM16 mono
 *   (navigateur → serveur : 16 kHz ; serveur → navigateur : 24 kHz).
 * - Les frames TEXTE transportent le JSON validé ci-dessous.
 *
 * Les mêmes schémas sont utilisés côté serveur ET côté navigateur pour
 * garantir un contrat unique (zod valide dans les deux sens).
 */

export const SIM_OPERATORS = ['orange', 'mtn'] as const;
export type SimOperator = (typeof SIM_OPERATORS)[number];

// ──────────────────────────────────────────────────────────────
// Client → Serveur
// ──────────────────────────────────────────────────────────────

export const CallStartSchema = z.object({
  type: z.literal('call.start'),
  dialed: z.string().min(1),
  callerNumber: z.string().min(1),
  simOperator: z.enum(SIM_OPERATORS),
  /** Filtre passe-bande 300–3400 Hz + 8 kHz pour simuler un vrai appel mobile. */
  phoneQualityMode: z.boolean().default(false),
  /** Contexte d'accès : appel direct au numéro, ou rappel déclenché par USSD. */
  accessMode: z.enum(['direct', 'ussd_callback']).default('direct'),
  /** Jeton de reprise de session (reconnexion après coupure, J6). */
  resumeToken: z.string().optional(),
});

export const CallHangupSchema = z.object({
  type: z.literal('call.hangup'),
});

export const CallMuteSchema = z.object({
  type: z.literal('call.mute'),
  muted: z.boolean(),
});

export const UssdSelectSchema = z.object({
  type: z.literal('ussd.select'),
  option: z.number().int().positive(),
});

/** Mesure de latence locale (fin de parole → premier échantillon audio joué). */
export const MetricsTurnReportSchema = z.object({
  type: z.literal('metrics.turn.report'),
  latencyMs: z.number().nonnegative(),
});

export const ClientEventSchema = z.discriminatedUnion('type', [
  CallStartSchema,
  CallHangupSchema,
  CallMuteSchema,
  UssdSelectSchema,
  MetricsTurnReportSchema,
]);
export type ClientEvent = z.infer<typeof ClientEventSchema>;

// ──────────────────────────────────────────────────────────────
// Serveur → Client
// ──────────────────────────────────────────────────────────────

export const CallRingingSchema = z.object({ type: z.literal('call.ringing') });

export const CallConnectedSchema = z.object({
  type: z.literal('call.connected'),
  callId: z.string(),
  /** Renvoyé pour permettre une reprise après coupure (J6). */
  resumeToken: z.string().optional(),
});

export const CallEndedSchema = z.object({
  type: z.literal('call.ended'),
  reason: z.string(),
  durationSec: z.number().nonnegative(),
});

/** Ordre de vidage immédiat de la file de lecture audio (interruption). */
export const AudioFlushSchema = z.object({ type: z.literal('audio.flush') });

export const TranscriptUserSchema = z.object({
  type: z.literal('transcript.user'),
  text: z.string(),
  final: z.boolean(),
});

export const TranscriptAgentSchema = z.object({
  type: z.literal('transcript.agent'),
  text: z.string(),
  final: z.boolean(),
});

export const ToolCalledSchema = z.object({
  type: z.literal('tool.called'),
  name: z.string(),
  args: z.record(z.unknown()),
});

export const ToolResultSchema = z.object({
  type: z.literal('tool.result'),
  name: z.string(),
  ok: z.boolean(),
});

export const SmsReceivedSchema = z.object({
  type: z.literal('sms.received'),
  from: z.string(),
  body: z.string(),
  at: z.string(), // ISO 8601
});

export const UssdMenuSchema = z.object({
  type: z.literal('ussd.menu'),
  text: z.string(),
  options: z.array(z.object({ index: z.number().int(), label: z.string() })),
});

export const MetricsTurnSchema = z.object({
  type: z.literal('metrics.turn'),
  latencyMs: z.number().nonnegative(),
});

export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  CallRingingSchema,
  CallConnectedSchema,
  CallEndedSchema,
  AudioFlushSchema,
  TranscriptUserSchema,
  TranscriptAgentSchema,
  ToolCalledSchema,
  ToolResultSchema,
  SmsReceivedSchema,
  UssdMenuSchema,
  MetricsTurnSchema,
  ErrorEventSchema,
]);
export type ServerEvent = z.infer<typeof ServerEventSchema>;

// ──────────────────────────────────────────────────────────────
// Aides de (dé)sérialisation sûres
// ──────────────────────────────────────────────────────────────

export function parseClientEvent(raw: string): ClientEvent | null {
  try {
    const json: unknown = JSON.parse(raw);
    const result = ClientEventSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function parseServerEvent(raw: string): ServerEvent | null {
  try {
    const json: unknown = JSON.parse(raw);
    const result = ServerEventSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function serializeServerEvent(event: ServerEvent): string {
  return JSON.stringify(event);
}

export function serializeClientEvent(event: ClientEvent): string {
  return JSON.stringify(event);
}
