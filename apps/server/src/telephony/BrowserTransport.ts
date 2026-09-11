import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import {
  parseClientEvent,
  serializeServerEvent,
  type ClientEvent,
  type ServerEvent,
} from '@nextiaa/shared';
import type { CallTransport } from './CallTransport.js';
import { logger } from '../logger.js';

/**
 * Transport navigateur : adapte le WebSocket /ws/call.
 *
 * - Frames BINAIRES  = audio PCM16 (entrant 16 kHz, sortant 24 kHz).
 * - Frames TEXTE     = événements JSON (validés par zod côté @nextiaa/shared).
 *
 * L'audio arrive déjà rééchantillonné à 16 kHz par le navigateur et repart en
 * 24 kHz tel quel : `BrowserTransport` ne fait aucune conversion de fréquence
 * (contrairement au futur `SipTransport` qui gérera le 8 kHz).
 */
export class BrowserTransport implements CallTransport {
  readonly callId: string;
  readonly callerNumber: string;
  readonly dialed: string;

  private readonly socket: WebSocket;
  private audioCb: ((pcm16k: Buffer) => void) | null = null;
  private hangupCb: ((reason: string) => void) | null = null;
  /** Événements client non-audio (mute, hangup, ussd, metrics) transmis à CallSession. */
  private clientEventCb: ((event: ClientEvent) => void) | null = null;
  private closed = false;

  constructor(socket: WebSocket, params: { callId?: string; callerNumber: string; dialed: string }) {
    this.socket = socket;
    this.callId = params.callId ?? randomUUID();
    this.callerNumber = params.callerNumber;
    this.dialed = params.dialed;

    // Un seul point d'écoute des messages : on distingue binaire (audio) et
    // texte (JSON) grâce au drapeau `isBinary` fourni par ws.
    this.socket.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        this.audioCb?.(Buffer.isBuffer(data) ? data : Buffer.from(data));
        return;
      }
      const raw = data.toString('utf8');
      const event = parseClientEvent(raw);
      if (!event) {
        logger.warn({ callId: this.callId }, 'Message client JSON invalide ignoré');
        this.sendEvent({ type: 'error', code: 'bad_message', message: 'Message invalide' });
        return;
      }
      if (event.type === 'call.hangup') {
        this.triggerHangup('client_hangup');
        return;
      }
      this.clientEventCb?.(event);
    });

    this.socket.on('close', () => this.triggerHangup('socket_closed'));
    this.socket.on('error', (err: Error) => {
      logger.error({ callId: this.callId, err }, 'Erreur WebSocket');
      this.triggerHangup('socket_error');
    });
  }

  onAudio(cb: (pcm16k: Buffer) => void): void {
    this.audioCb = cb;
  }

  /** Abonnement aux événements client non-audio (utilisé par CallSession). */
  onClientEvent(cb: (event: ClientEvent) => void): void {
    this.clientEventCb = cb;
  }

  sendAudio(pcm24k: Buffer): void {
    if (this.closed || this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(pcm24k, { binary: true });
  }

  flushPlayback(): void {
    // Le vidage réel a lieu dans le navigateur ; on lui envoie l'ordre.
    this.sendEvent({ type: 'audio.flush' });
  }

  sendEvent(event: ServerEvent): void {
    if (this.closed || this.socket.readyState !== this.socket.OPEN) return;
    this.socket.send(serializeServerEvent(event));
  }

  hangup(reason: string): void {
    if (this.closed) return;
    this.triggerHangup(reason);
    try {
      this.socket.close();
    } catch {
      /* déjà fermé */
    }
  }

  onHangup(cb: (reason: string) => void): void {
    this.hangupCb = cb;
  }

  private triggerHangup(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.hangupCb?.(reason);
  }
}
