import { toPcm16k, pcm16BufferToFloat } from './resample.js';
import { toPhoneQualityPcm16k } from './phoneFilter.js';
import { LocalVad } from './localVad.js';
// Les worklets sont chargés par URL. En dev, Vite transpile le .ts à la volée ;
// en build, un petit plugin (voir vite.config.ts) les émet en modules JS séparés.
import captureWorkletUrl from './capture.worklet.ts?worklet-url';
import playbackWorkletUrl from './playback.worklet.ts?worklet-url';

/**
 * Moteur audio du navigateur.
 *
 * - Capture micro → rééchantillonnage 16 kHz → PCM16 → callback (envoi serveur).
 * - Réception PCM16 24 kHz → lecture via un AudioContext à 24 kHz.
 * - `flush()` vide la file de lecture sur interruption.
 * - `stop()` garantit le nettoyage (pistes micro, nœuds, contextes).
 *
 * Le mode « qualité téléphone » (passe-bande + 8 kHz) est ajouté au J2.
 */
export class AudioEngine {
  private captureCtx: AudioContext | null = null;
  private playbackCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private captureNode: AudioWorkletNode | null = null;
  private playbackNode: AudioWorkletNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private muted = false;
  private phoneQualityMode = false;
  // Mesure de latence : instant de fin de parole → premier audio joué.
  private vad: LocalVad | null = null;
  private speechEndAt: number | null = null;
  private onLatency: ((ms: number) => void) | null = null;

  /**
   * Démarre la capture et la lecture.
   * @param phoneQualityMode applique le filtre « qualité téléphone » à la capture.
   * @param onLatency callback de mesure de latence (fin de parole → 1er audio joué).
   * @throws si l'autorisation micro est refusée (à présenter clairement à l'utilisateur).
   */
  async start(
    onPcm16k: (pcm16k: ArrayBuffer) => void,
    phoneQualityMode = false,
    onLatency?: (ms: number) => void,
  ): Promise<void> {
    this.phoneQualityMode = phoneQualityMode;
    this.onLatency = onLatency ?? null;
    // À chaque fin de parole détectée localement, on arme le chronomètre.
    this.vad = new LocalVad(() => {
      this.speechEndAt = performance.now();
    });
    // 1) Micro (peut lever NotAllowedError si l'utilisateur refuse).
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    // 2) Contexte de capture (fréquence native, souvent 48 kHz).
    this.captureCtx = new AudioContext();
    await this.captureCtx.audioWorklet.addModule(captureWorkletUrl);
    this.micSource = this.captureCtx.createMediaStreamSource(this.micStream);
    this.captureNode = new AudioWorkletNode(this.captureCtx, 'capture-processor');
    this.captureNode.port.onmessage = (e: MessageEvent) => {
      if (this.muted) return;
      const { samples, sampleRate } = e.data as { samples: Float32Array; sampleRate: number };
      this.vad?.push(samples); // mesure de latence
      const pcm = this.phoneQualityMode
        ? toPhoneQualityPcm16k(samples, sampleRate)
        : toPcm16k(samples, sampleRate);
      // Copie exacte des octets PCM16 dans un ArrayBuffer neuf (envoi binaire).
      const bytes = new Uint8Array(pcm.byteLength);
      bytes.set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
      onPcm16k(bytes.buffer);
    };
    this.micSource.connect(this.captureNode);
    // Le worklet de capture n'émet pas de son : pas de connexion à destination.

    // 3) Contexte de lecture à 24 kHz (audio de l'assistant, sans resample).
    this.playbackCtx = new AudioContext({ sampleRate: 24000 });
    await this.playbackCtx.audioWorklet.addModule(playbackWorkletUrl);
    this.playbackNode = new AudioWorkletNode(this.playbackCtx, 'playback-processor');
    this.playbackNode.connect(this.playbackCtx.destination);
  }

  /** Joue un morceau d'audio de l'assistant (PCM16 24 kHz). */
  playPcm24k(buffer: ArrayBuffer): void {
    if (!this.playbackNode) return;
    // Premier échantillon joué après une fin de parole → latence du tour.
    if (this.speechEndAt !== null) {
      this.onLatency?.(Math.round(performance.now() - this.speechEndAt));
      this.speechEndAt = null;
    }
    const float = pcm16BufferToFloat(buffer);
    this.playbackNode.port.postMessage({ samples: float }, [float.buffer]);
  }

  /** Vide immédiatement la file de lecture (interruption). */
  flush(): void {
    this.playbackNode?.port.postMessage({ type: 'flush' });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Nettoyage garanti de toutes les ressources audio. */
  async stop(): Promise<void> {
    try {
      this.micStream?.getTracks().forEach((t) => t.stop());
      this.micSource?.disconnect();
      this.captureNode?.disconnect();
      this.playbackNode?.disconnect();
      await this.captureCtx?.close();
      await this.playbackCtx?.close();
    } catch {
      /* best effort */
    } finally {
      this.micStream = null;
      this.micSource = null;
      this.captureNode = null;
      this.playbackNode = null;
      this.captureCtx = null;
      this.playbackCtx = null;
    }
  }
}
