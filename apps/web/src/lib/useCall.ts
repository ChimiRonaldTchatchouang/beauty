import { useCallback, useRef, useState } from 'react';
import type { ServerEvent, SimOperator } from '@nextiaa/shared';
import { AudioEngine } from '../audio/AudioEngine.js';
import { CallClient } from './ws.js';

export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'error';

export interface TranscriptLine {
  id: number;
  who: 'user' | 'agent';
  text: string;
  final: boolean;
}

export interface StartParams {
  dialed: string;
  callerNumber: string;
  simOperator: SimOperator;
  phoneQualityMode: boolean;
  accessMode?: 'direct' | 'ussd_callback';
}

export interface SmsMessage {
  id: number;
  from: string;
  body: string;
  at: string;
}

export interface CallState {
  status: CallStatus;
  transcripts: TranscriptLine[];
  error: string | null;
  muted: boolean;
  lastEndReason: string | null;
  sms: SmsMessage[];
  lastLatencyMs: number | null;
}

/**
 * Hook central de l'appel : relie AudioEngine (micro/lecture) et CallClient
 * (WebSocket). Gère l'état pour l'UI et garantit le nettoyage à la fin.
 */
export function useCall() {
  const [state, setState] = useState<CallState>({
    status: 'idle',
    transcripts: [],
    error: null,
    muted: false,
    lastEndReason: null,
    sms: [],
    lastLatencyMs: null,
  });
  const smsIdRef = useRef(0);

  const engineRef = useRef<AudioEngine | null>(null);
  const clientRef = useRef<CallClient | null>(null);
  const connectedRef = useRef(false);
  const lineIdRef = useRef(0);
  // Reprise après coupure (J6).
  const resumeTokenRef = useRef<string | undefined>(undefined);
  const lastParamsRef = useRef<StartParams | null>(null);
  const userHangupRef = useRef(false);
  const reconnectDeadlineRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  /** Fenêtre de reprise après coupure : 60 secondes. */
  const RESUME_WINDOW_MS = 60_000;
  // Ligne courante par locuteur, pour agréger les transcriptions partielles.
  const openLineRef = useRef<{ user: number | null; agent: number | null }>({ user: null, agent: null });

  const cleanup = useCallback(async () => {
    connectedRef.current = false;
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    clientRef.current?.close();
    clientRef.current = null;
    await engineRef.current?.stop();
    engineRef.current = null;
    resumeTokenRef.current = undefined;
  }, []);

  const appendTranscript = useCallback((who: 'user' | 'agent', text: string, final: boolean) => {
    setState((prev) => {
      const lines = [...prev.transcripts];
      const openId = openLineRef.current[who];
      const idx = openId !== null ? lines.findIndex((l) => l.id === openId) : -1;
      if (idx >= 0) {
        // On complète la ligne partielle en cours.
        lines[idx] = { ...lines[idx]!, text: lines[idx]!.text + text, final };
      } else {
        const id = ++lineIdRef.current;
        openLineRef.current[who] = id;
        lines.push({ id, who, text, final });
      }
      if (final) openLineRef.current[who] = null;
      return { ...prev, transcripts: lines };
    });
  }, []);

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case 'call.ringing':
          setState((p) => ({ ...p, status: 'ringing' }));
          break;
        case 'call.connected':
          connectedRef.current = true;
          resumeTokenRef.current = event.resumeToken ?? resumeTokenRef.current;
          reconnectDeadlineRef.current = 0; // reprise réussie : on réarme la fenêtre
          setState((p) => ({ ...p, status: 'connected' }));
          break;
        case 'audio.flush':
          engineRef.current?.flush();
          break;
        case 'transcript.user':
          appendTranscript('user', event.text, event.final);
          break;
        case 'transcript.agent':
          appendTranscript('agent', event.text, event.final);
          break;
        case 'metrics.turn':
          setState((p) => ({ ...p, lastLatencyMs: event.latencyMs }));
          break;
        case 'sms.received':
          setState((p) => ({
            ...p,
            sms: [{ id: ++smsIdRef.current, from: event.from, body: event.body, at: event.at }, ...p.sms],
          }));
          break;
        case 'call.ended':
          setState((p) => ({ ...p, status: 'ended', lastEndReason: event.reason }));
          void cleanup();
          break;
        case 'error':
          setState((p) => ({ ...p, status: 'error', error: event.message }));
          void cleanup();
          break;
        default:
          break;
      }
    },
    [appendTranscript, cleanup],
  );

  // Établit (ou rétablit) la connexion WebSocket. `resume` = reprise après coupure.
  const connectClientRef = useRef<(resume: boolean) => void>(() => undefined);
  const connectClient = useCallback(
    (resume: boolean) => {
      const params = lastParamsRef.current;
      if (!params) return;
      const client = new CallClient({
        onAudio: (buf) => engineRef.current?.playPcm24k(buf),
        onEvent: handleEvent,
        onClose: () => {
          connectedRef.current = false;
          if (userHangupRef.current) {
            void cleanup();
            return;
          }
          // Coupure inattendue : tenter la reprise dans la fenêtre de 60 s.
          const now = Date.now();
          if (reconnectDeadlineRef.current === 0) reconnectDeadlineRef.current = now + RESUME_WINDOW_MS;
          if (resumeTokenRef.current && now < reconnectDeadlineRef.current) {
            setState((p) => ({ ...p, status: 'reconnecting' }));
            reconnectTimerRef.current = window.setTimeout(() => connectClientRef.current(true), 1500);
          } else {
            setState((p) =>
              ['connected', 'connecting', 'reconnecting'].includes(p.status) ? { ...p, status: 'ended', lastEndReason: 'disconnected' } : p,
            );
            void cleanup();
          }
        },
      });
      clientRef.current = client;
      client.connect({
        type: 'call.start',
        dialed: params.dialed,
        callerNumber: params.callerNumber,
        simOperator: params.simOperator,
        phoneQualityMode: params.phoneQualityMode,
        accessMode: params.accessMode ?? 'direct',
        resumeToken: resume ? resumeTokenRef.current : undefined,
      });
    },
    [cleanup, handleEvent],
  );
  connectClientRef.current = connectClient;

  const start = useCallback(
    async (params: StartParams) => {
      // On conserve la boîte SMS entre les appels (comme un vrai téléphone).
      setState((p) => ({ status: 'connecting', transcripts: [], error: null, muted: false, lastEndReason: null, sms: p.sms, lastLatencyMs: null }));
      openLineRef.current = { user: null, agent: null };
      userHangupRef.current = false;
      reconnectDeadlineRef.current = 0;
      resumeTokenRef.current = undefined;
      lastParamsRef.current = params;

      const engine = new AudioEngine();
      engineRef.current = engine;

      // La permission micro est demandée ici (geste utilisateur).
      try {
        await engine.start(
          (pcm16k) => {
            if (connectedRef.current) clientRef.current?.sendAudio(pcm16k);
          },
          params.phoneQualityMode,
          (latencyMs) => {
            // On rapporte la latence mesurée localement au serveur (persistée par tour).
            if (connectedRef.current) clientRef.current?.send({ type: 'metrics.turn.report', latencyMs });
            setState((p) => ({ ...p, lastLatencyMs: latencyMs }));
          },
        );
      } catch (err) {
        const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        setState((p) => ({
          ...p,
          status: 'error',
          error: denied
            ? "Accès au micro refusé. Autorisez le microphone dans votre navigateur pour parler à l'assistant."
            : "Impossible d'accéder au micro sur cet appareil.",
        }));
        await cleanup();
        return;
      }

      connectClient(false);
    },
    [cleanup, connectClient],
  );

  const hangup = useCallback(async () => {
    userHangupRef.current = true;
    setState((p) => ({ ...p, status: 'ended' }));
    await cleanup();
  }, [cleanup]);

  /** Injecte un SMS local dans la boîte (ex. « menu par SMS » du parcours USSD). */
  const pushLocalSms = useCallback((from: string, body: string) => {
    setState((p) => ({
      ...p,
      sms: [{ id: ++smsIdRef.current, from, body, at: new Date().toISOString() }, ...p.sms],
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((p) => {
      const muted = !p.muted;
      engineRef.current?.setMuted(muted);
      clientRef.current?.send({ type: 'call.mute', muted });
      return { ...p, muted };
    });
  }, []);

  return { state, start, hangup, toggleMute, pushLocalSms };
}
