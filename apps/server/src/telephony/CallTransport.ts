import type { ServerEvent } from '@nextiaa/shared';

/**
 * Abstraction du transport d'un appel.
 *
 * `CallSession` ne connaît QUE cette interface : il reçoit l'audio de
 * l'appelant en PCM16 16 kHz via `onAudio`, renvoie l'audio de l'assistant en
 * PCM16 24 kHz via `sendAudio`, pousse des événements vers le client via
 * `sendEvent`, et vide la file de lecture via `flushPlayback` (interruption).
 *
 * Aujourd'hui : `BrowserTransport` (téléphone simulé dans le navigateur).
 * Demain : `SipTransport` (vraie ligne téléphonique, audio 8 kHz à
 * rééchantillonner) — même interface, aucun changement dans `CallSession`.
 * Voir docs/ARCHITECTURE.md.
 */
export interface CallTransport {
  readonly callId: string;
  /** Numéro simulé de l'appelant (fictif). */
  readonly callerNumber: string;
  /** Numéro ou code composé. */
  readonly dialed: string;

  /** Abonnement à l'audio entrant (PCM16 mono 16 kHz). */
  onAudio(cb: (pcm16k: Buffer) => void): void;
  /** Envoi de l'audio sortant vers l'appelant (PCM16 mono 24 kHz). */
  sendAudio(pcm24k: Buffer): void;
  /** Vidage immédiat de la file de lecture (appelé sur interruption). */
  flushPlayback(): void;

  /** Envoi d'un événement JSON typé vers le client. */
  sendEvent(event: ServerEvent): void;

  /** Raccrochage à l'initiative du serveur. */
  hangup(reason: string): void;
  /** Abonnement au raccrochage (client ou serveur). */
  onHangup(cb: (reason: string) => void): void;
}
