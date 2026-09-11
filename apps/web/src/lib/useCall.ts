import { useCallback, useRef, useState } from 'react';
import type { ServerEvent, SimOperator } from '@nextiaa/shared';
import { AudioEngine } from '../audio/AudioEngine.js';
import { CallClient } from './ws.js';

export type CallStatus = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'error';

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

export interface CallState {
  status: CallStatus;
  transcripts: TranscriptLine[];
  error: string | null;
  muted: boolean;
  lastEndReason: string | null;
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
  });

  const engineRef = useRef<AudioEngine | null>(null);
  const clientRef = useRef<CallClient | null>(null);
  const connectedRef = useRef(false);
  const lineIdRef = useRef(0);
  // Ligne courante par locuteur, pour agréger les transcriptions partielles.
  const openLineRef = useRef<{ user: number | null; agent: number | null }>({ user: null, agent: null });

  const cleanup = useCallback(async () => {
    connectedRef.current = false;
    clientRef.current?.close();
    clientRef.current = null;
    await engineRef.current?.stop();
    engineRef.current = null;
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

  const start = useCallback(
    async (params: StartParams) => {
      setState({ status: 'connecting', transcripts: [], error: null, muted: false, lastEndReason: null });
      openLineRef.current = { user: null, agent: null };

      const engine = new AudioEngine();
      engineRef.current = engine;

      // La permission micro est demandée ici (geste utilisateur).
      try {
        await engine.start((pcm16k) => {
          if (connectedRef.current) clientRef.current?.sendAudio(pcm16k);
        }, params.phoneQualityMode);
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

      const client = new CallClient({
        onAudio: (buf) => engineRef.current?.playPcm24k(buf),
        onEvent: handleEvent,
        onClose: () => {
          setState((p) => (p.status === 'connected' || p.status === 'connecting' ? { ...p, status: 'ended' } : p));
          void cleanup();
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
      });
    },
    [cleanup, handleEvent],
  );

  const hangup = useCallback(async () => {
    setState((p) => ({ ...p, status: 'ended' }));
    await cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    setState((p) => {
      const muted = !p.muted;
      engineRef.current?.setMuted(muted);
      clientRef.current?.send({ type: 'call.mute', muted });
      return { ...p, muted };
    });
  }, []);

  return { state, start, hangup, toggleMute };
}
