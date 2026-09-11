import type { Repository } from '../db/repository.js';
import type { CallTransport } from '../telephony/CallTransport.js';
import type { SendSmsArgs } from '@nextiaa/shared';

/**
 * Envoi d'un SMS SIMULÉ vers le numéro fictif de l'appelant.
 * Enregistré en base et poussé au navigateur (événement sms.received), qui
 * l'affiche dans l'application SMS. À n'appeler qu'après confirmation.
 */
export function sendSms(
  repo: Repository,
  transport: CallTransport,
  args: SendSmsArgs,
): { ok: boolean; to: string } {
  const row = repo.addSms(transport.callId, transport.callerNumber, args.message);
  transport.sendEvent({ type: 'sms.received', from: row.from_label, body: row.body, at: row.at });
  return { ok: true, to: transport.callerNumber };
}
