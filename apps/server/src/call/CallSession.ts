import type { FunctionCall, FunctionDeclaration, UsageMetadata } from '@google/genai';
import type { SimOperator, ClientEvent } from '@nextiaa/shared';
import type { CallTransport } from '../telephony/CallTransport.js';
import type { BrowserTransport } from '../telephony/BrowserTransport.js';
import { GeminiLiveClient } from './GeminiLiveClient.js';
import { buildSystemPrompt, GREETING_INSTRUCTION, RESUME_GREETING_INSTRUCTION } from './systemPrompt.js';
import type { Logger } from '../logger.js';

/**
 * Exécuteur d'outils injecté dans la session (implémenté par le ToolRouter au
 * J3/J4). Découplé pour que la boucle audio J1 fonctionne sans aucun outil.
 */
export interface ToolExecutor {
  readonly declarations: FunctionDeclaration[];
  execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<{ ok: boolean; response: Record<string, unknown> }>;
}

export interface ToolExecutionContext {
  callId: string;
  callerNumber: string;
  simOperator: SimOperator;
  transport: CallTransport;
  /** Demande de fin d'appel propre (outil end_call). */
  requestHangup(reason: string): void;
  /** Change le statut de l'appel (ex. 'transferred', 'resolved'). */
  setStatus(status: string): void;
}

export interface CallSessionOptions {
  apiKey: string;
  model: string;
  voice: string;
  vadSilenceMs: number;
  maxCallMinutes: number;
  simOperator: SimOperator;
  accessMode: 'direct' | 'ussd_callback';
  resumeHandle?: string;
  /** Outils disponibles (vide au J1). */
  toolExecutor?: ToolExecutor;
  /** Persistance d'une ligne de transcription finale. */
  onTranscriptFinal?(who: 'user' | 'agent', text: string, latencyMs: number | null): void;
  /** Persistance d'une mesure de latence de tour. */
  onLatency?(latencyMs: number): void;
  /** Marque l'appel comme transféré (statut console). */
  onStatus?(status: string): void;
  /** Notification de fin d'appel (persistance, métriques). */
  onEnded?(info: { callId: string; reason: string; durationSec: number; usage: UsageMetadata | null }): void;
}

/**
 * Orchestration d'un appel : relie le transport (navigateur/SIP) à la session
 * Gemini Live. Ne dépend QUE de l'interface `CallTransport`.
 */
export class CallSession {
  private gemini: GeminiLiveClient | null = null;
  private muted = false;
  private ended = false;
  private readonly startedAt = Date.now();
  private lastUsage: UsageMetadata | null = null;
  private resumeHandle: string | undefined;
  private maxTimer: NodeJS.Timeout | null = null;
  private warnTimer: NodeJS.Timeout | null = null;
  // Accumulation des fragments de transcription jusqu'au marqueur « final ».
  private userBuf = '';
  private agentBuf = '';
  // Dernière latence rapportée par le navigateur, attachée au prochain tour agent.
  private pendingLatencyMs: number | null = null;

  constructor(
    private readonly transport: CallTransport,
    private readonly opts: CallSessionOptions,
    private readonly log: Logger,
  ) {
    this.resumeHandle = opts.resumeHandle;
  }

  async start(): Promise<void> {
    const systemInstruction = buildSystemPrompt({
      operator: this.opts.simOperator,
      callerNumber: this.transport.callerNumber,
      accessMode: this.opts.accessMode,
    });

    this.gemini = new GeminiLiveClient(
      {
        apiKey: this.opts.apiKey,
        model: this.opts.model,
        voice: this.opts.voice,
        vadSilenceMs: this.opts.vadSilenceMs,
        systemInstruction,
        functionDeclarations: this.opts.toolExecutor?.declarations ?? [],
        resumeHandle: this.resumeHandle,
      },
      {
        onAudio: (pcm24k) => this.transport.sendAudio(pcm24k),
        onInputTranscript: (text, final) => {
          this.transport.sendEvent({ type: 'transcript.user', text, final });
          this.userBuf += text;
          if (final && this.userBuf.trim()) {
            this.opts.onTranscriptFinal?.('user', this.userBuf.trim(), null);
            this.userBuf = '';
          }
        },
        onOutputTranscript: (text, final) => {
          this.transport.sendEvent({ type: 'transcript.agent', text, final });
          this.agentBuf += text;
          if (final && this.agentBuf.trim()) {
            // La latence mesurée côté navigateur est attachée au tour de l'assistant.
            this.opts.onTranscriptFinal?.('agent', this.agentBuf.trim(), this.pendingLatencyMs);
            this.pendingLatencyMs = null;
            this.agentBuf = '';
          }
        },
        onInterrupted: () => this.transport.flushPlayback(),
        onTurnComplete: () => {
          /* fin de tour ; la latence est mesurée côté navigateur (J5). */
        },
        onToolCall: (calls) => void this.handleToolCalls(calls),
        onUsage: (usage) => {
          this.lastUsage = usage;
        },
        onResumeHandle: (handle) => {
          this.resumeHandle = handle;
        },
        onError: (err) => this.handleGeminiError(err),
        onClose: (reason) => this.end(`gemini:${reason}`),
      },
      this.log,
    );

    // Câblage transport → Gemini pour l'audio entrant.
    this.transport.onAudio((pcm16k) => {
      if (!this.muted) this.gemini?.sendAudio(pcm16k);
    });
    this.transport.onHangup((reason) => this.end(reason));

    // Événements client non-audio (mute, ussd, métriques).
    if (isBrowserTransport(this.transport)) {
      this.transport.onClientEvent((event) => this.handleClientEvent(event));
    }

    try {
      await this.gemini.connect();
    } catch (err) {
      this.handleGeminiError(err);
      return;
    }

    this.transport.sendEvent({ type: 'call.connected', callId: this.transport.callId, resumeToken: this.resumeHandle });

    // Message d'accueil : standard, ou consigne de reprise après coupure (J6).
    this.gemini.sendText(this.opts.resumeHandle ? RESUME_GREETING_INSTRUCTION : GREETING_INSTRUCTION);

    this.scheduleDurationLimits();
    this.log.info({ callId: this.transport.callId }, 'Appel démarré');
  }

  private handleClientEvent(event: ClientEvent): void {
    switch (event.type) {
      case 'call.mute':
        this.muted = event.muted;
        break;
      case 'metrics.turn.report':
        this.pendingLatencyMs = event.latencyMs;
        this.opts.onLatency?.(event.latencyMs);
        this.transport.sendEvent({ type: 'metrics.turn', latencyMs: event.latencyMs });
        break;
      // ussd.select est géré au niveau du menu USSD (J6).
      default:
        break;
    }
  }

  private async handleToolCalls(calls: FunctionCall[]): Promise<void> {
    const executor = this.opts.toolExecutor;
    const responses: { id?: string; name: string; response: Record<string, unknown> }[] = [];

    for (const call of calls) {
      const name = call.name ?? 'inconnu';
      const args = (call.args ?? {}) as Record<string, unknown>;
      this.transport.sendEvent({ type: 'tool.called', name, args });

      if (!executor) {
        responses.push({ id: call.id, name, response: { error: 'Aucun outil disponible' } });
        this.transport.sendEvent({ type: 'tool.result', name, ok: false });
        continue;
      }

      try {
        const result = await executor.execute(name, args, {
          callId: this.transport.callId,
          callerNumber: this.transport.callerNumber,
          simOperator: this.opts.simOperator,
          transport: this.transport,
          requestHangup: (reason) => this.gracefulHangup(reason),
          setStatus: (status) => this.opts.onStatus?.(status),
        });
        responses.push({ id: call.id, name, response: result.response });
        this.transport.sendEvent({ type: 'tool.result', name, ok: result.ok });
      } catch (err) {
        this.log.error({ callId: this.transport.callId, name, err }, "Erreur d'exécution d'outil");
        responses.push({ id: call.id, name, response: { error: 'Erreur interne de l\'outil' } });
        this.transport.sendEvent({ type: 'tool.result', name, ok: false });
      }
    }

    // Réponse synchrone : le modèle attend avant de parler.
    this.gemini?.sendToolResponse(responses);
  }

  /** Laisse l'audio en cours se terminer un court instant puis raccroche (end_call). */
  private gracefulHangup(reason: string): void {
    setTimeout(() => this.end(reason), 1500);
  }

  private handleGeminiError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    const isQuota = /429|quota|rate.?limit|resource.?exhausted/i.test(message);
    this.log.error({ callId: this.transport.callId, err: message }, 'Erreur Gemini');
    if (isQuota) {
      this.transport.sendEvent({
        type: 'error',
        code: 'quota',
        message: 'Service momentanément saturé, réessayez dans un instant.',
      });
    } else {
      this.transport.sendEvent({ type: 'error', code: 'gemini', message: 'Interruption du service vocal.' });
    }
    this.end(isQuota ? 'quota' : 'gemini_error');
  }

  private scheduleDurationLimits(): void {
    const maxMs = this.opts.maxCallMinutes * 60_000;
    // Avertissement une minute avant la limite.
    const warnMs = Math.max(0, maxMs - 60_000);
    this.warnTimer = setTimeout(() => {
      this.gemini?.sendText(
        'Il reste environ une minute avant la fin de l\'appel. Préviens poliment l\'appelant et conclus par un résumé, puis termine.',
      );
    }, warnMs);
    this.maxTimer = setTimeout(() => this.end('max_duration'), maxMs);
  }

  /** Fin d'appel : nettoyage garanti (Gemini fermé, timers, événement, persistance). */
  private end(reason: string): void {
    if (this.ended) return;
    this.ended = true;
    if (this.warnTimer) clearTimeout(this.warnTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.gemini?.close();

    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    this.transport.sendEvent({ type: 'call.ended', reason, durationSec });
    this.transport.hangup(reason);
    this.opts.onEnded?.({ callId: this.transport.callId, reason, durationSec, usage: this.lastUsage });
    this.log.info({ callId: this.transport.callId, reason, durationSec }, 'Appel terminé');
  }
}

function isBrowserTransport(t: CallTransport): t is BrowserTransport {
  return typeof (t as BrowserTransport).onClientEvent === 'function';
}
