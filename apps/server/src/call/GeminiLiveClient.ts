import {
  GoogleGenAI,
  type FunctionCall,
  type FunctionDeclaration,
  type LiveServerMessage,
  type Session,
  type UsageMetadata,
} from '@google/genai';
import { buildLiveConfig } from './sessionConfig.js';
import type { Logger } from '../logger.js';

export interface GeminiLiveCallbacks {
  /** Audio de l'assistant décodé (PCM16 24 kHz). */
  onAudio(pcm24k: Buffer): void;
  /** Transcription de l'appelant. */
  onInputTranscript(text: string, finished: boolean): void;
  /** Transcription de l'assistant. */
  onOutputTranscript(text: string, finished: boolean): void;
  /** Interruption : vider immédiatement la file de lecture. */
  onInterrupted(): void;
  /** Fin d'un tour de l'assistant. */
  onTurnComplete(): void;
  /** Appels d'outils demandés par le modèle. */
  onToolCall(functionCalls: FunctionCall[]): void;
  /** Consommation renvoyée par Gemini (à enregistrer). */
  onUsage(usage: UsageMetadata): void;
  /** Nouveau jeton de reprise de session (J6). */
  onResumeHandle(handle: string): void;
  /** Erreur de la session Gemini. */
  onError(err: unknown): void;
  /** Fermeture de la session Gemini. */
  onClose(reason: string): void;
}

export interface GeminiLiveOptions {
  apiKey: string;
  model: string;
  voice: string;
  vadSilenceMs: number;
  systemInstruction: string;
  functionDeclarations: FunctionDeclaration[];
  resumeHandle?: string;
}

/**
 * Client de session Gemini Live (côté serveur).
 *
 * Encapsule `ai.live.connect` et expose des méthodes simples à `CallSession` :
 * envoyer de l'audio/texte, répondre à un outil, fermer. Les messages serveur
 * sont dispatchés vers les callbacks. **La clé API reste ici, côté serveur.**
 */
export class GeminiLiveClient {
  private session: Session | null = null;
  private readonly ai: GoogleGenAI;
  private closed = false;

  constructor(
    private readonly opts: GeminiLiveOptions,
    private readonly cb: GeminiLiveCallbacks,
    private readonly log: Logger,
  ) {
    this.ai = new GoogleGenAI({ apiKey: opts.apiKey });
  }

  async connect(): Promise<void> {
    const config = buildLiveConfig({
      model: this.opts.model,
      systemInstruction: this.opts.systemInstruction,
      voice: this.opts.voice,
      vadSilenceMs: this.opts.vadSilenceMs,
      functionDeclarations: this.opts.functionDeclarations,
      resumeHandle: this.opts.resumeHandle,
    });

    this.session = await this.ai.live.connect({
      model: this.opts.model,
      config,
      callbacks: {
        onopen: () => this.log.debug('Session Gemini ouverte'),
        onmessage: (message: LiveServerMessage) => this.handleMessage(message),
        onerror: (e: unknown) => this.cb.onError(e),
        onclose: (e: { reason?: string }) => {
          if (!this.closed) this.cb.onClose(e?.reason ?? 'gemini_closed');
        },
      },
    });
  }

  /** Traite un message serveur. Un message peut porter PLUSIEURS parties. */
  private handleMessage(message: LiveServerMessage): void {
    const content = message.serverContent;

    // Interruption : signal prioritaire (l'appelant a coupé la parole).
    if (content?.interrupted) {
      this.cb.onInterrupted();
    }

    // Toutes les parties du tour du modèle (audio et/ou texte).
    const parts = content?.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData;
      if (inline?.data) {
        // Audio PCM16 24 kHz encodé en base64.
        this.cb.onAudio(Buffer.from(inline.data, 'base64'));
      }
    }

    // Transcriptions (indépendantes du tour, peuvent arriver séparément).
    if (content?.inputTranscription?.text) {
      this.cb.onInputTranscript(content.inputTranscription.text, content.inputTranscription.finished ?? false);
    }
    if (content?.outputTranscription?.text) {
      this.cb.onOutputTranscript(content.outputTranscription.text, content.outputTranscription.finished ?? false);
    }

    if (content?.turnComplete) {
      this.cb.onTurnComplete();
    }

    // Appels d'outils (synchrones : le modèle attend nos réponses).
    if (message.toolCall?.functionCalls?.length) {
      this.cb.onToolCall(message.toolCall.functionCalls);
    }

    if (message.usageMetadata) {
      this.cb.onUsage(message.usageMetadata);
    }

    // Jeton de reprise de session (J6).
    const resume = message.sessionResumptionUpdate;
    if (resume?.resumable && resume.newHandle) {
      this.cb.onResumeHandle(resume.newHandle);
    }
  }

  /** Envoie un morceau d'audio de l'appelant (PCM16 16 kHz). */
  sendAudio(pcm16k: Buffer): void {
    if (!this.session || this.closed) return;
    this.session.sendRealtimeInput({
      audio: { data: pcm16k.toString('base64'), mimeType: 'audio/pcm;rate=16000' },
    });
  }

  /**
   * Injecte du texte EN COURS de conversation (ex. consigne d'accueil).
   * On utilise `sendRealtimeInput({ text })` et non `sendClientContent`
   * (réservé à l'injection d'un historique initial).
   */
  sendText(text: string): void {
    if (!this.session || this.closed) return;
    this.session.sendRealtimeInput({ text });
  }

  /** Répond à un appel d'outil (function calling synchrone). */
  sendToolResponse(responses: { id?: string; name: string; response: Record<string, unknown> }[]): void {
    if (!this.session || this.closed) return;
    this.session.sendToolResponse({ functionResponses: responses });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.session?.close();
    } catch {
      /* déjà fermée */
    }
    this.session = null;
  }
}
