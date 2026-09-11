import {
  parseServerEvent,
  serializeClientEvent,
  type ClientEvent,
  type ServerEvent,
} from '@nextiaa/shared';

export interface CallClientHandlers {
  /** Audio de l'assistant (PCM16 24 kHz) reçu en binaire. */
  onAudio(buffer: ArrayBuffer): void;
  /** Événement JSON serveur validé. */
  onEvent(event: ServerEvent): void;
  /** Fermeture de la connexion. */
  onClose(): void;
}

/** URL WebSocket dérivée de l'origine (le proxy Vite route /ws vers le serveur). */
function wsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws/call`;
}

/**
 * Client d'appel WebSocket (navigateur).
 * Binaire = audio ; texte = événements JSON validés par zod (@nextiaa/shared).
 */
export class CallClient {
  private ws: WebSocket | null = null;

  constructor(private readonly handlers: CallClientHandlers) {}

  connect(start: Extract<ClientEvent, { type: 'call.start' }>): void {
    const ws = new WebSocket(wsUrl());
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => this.send(start);
    ws.onmessage = (e: MessageEvent) => {
      if (e.data instanceof ArrayBuffer) {
        this.handlers.onAudio(e.data);
        return;
      }
      const event = parseServerEvent(typeof e.data === 'string' ? e.data : '');
      if (event) this.handlers.onEvent(event);
    };
    ws.onclose = () => this.handlers.onClose();
    ws.onerror = () => {
      /* la fermeture suivra ; onClose gère la suite */
    };
  }

  /** Envoi d'un morceau d'audio (PCM16 16 kHz) en binaire. */
  sendAudio(pcm16k: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(pcm16k);
  }

  /** Envoi d'un événement client JSON. */
  send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(serializeClientEvent(event));
  }

  close(): void {
    try {
      this.send({ type: 'call.hangup' });
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}
