/**
 * AudioWorklet de LECTURE de l'audio de l'assistant.
 *
 * Reçoit des morceaux Float32 (issus du PCM16 24 kHz décodé côté principal) et
 * les joue dans l'ordre. Sur interruption, le thread principal envoie
 * `{ type: 'flush' }` : on vide IMMÉDIATEMENT la file pour couper la voix de
 * l'assistant (l'appelant vient de reprendre la parole).
 *
 * L'AudioContext de lecture est créé à 24 kHz : aucun rééchantillonnage ici.
 */

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;

class PlaybackProcessor extends AudioWorkletProcessor {
  private queue: Float32Array[] = [];
  private current: Float32Array | null = null;
  private pos = 0;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      const msg = e.data as { type?: string; samples?: Float32Array };
      if (msg.type === 'flush') {
        // Vidage instantané (interruption).
        this.queue = [];
        this.current = null;
        this.pos = 0;
      } else if (msg.samples) {
        this.queue.push(msg.samples);
      }
    };
  }

  override process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0]?.[0];
    if (!output) return true;

    for (let i = 0; i < output.length; i++) {
      if (!this.current || this.pos >= this.current.length) {
        this.current = this.queue.shift() ?? null;
        this.pos = 0;
      }
      output[i] = this.current ? (this.current[this.pos++] ?? 0) : 0;
    }
    return true;
  }
}

registerProcessor('playback-processor', PlaybackProcessor);

// `export {}` : fichier traité comme module (voir capture.worklet.ts).
export {};
