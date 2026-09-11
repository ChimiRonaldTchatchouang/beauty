/**
 * AudioWorklet de CAPTURE micro.
 *
 * Tourne dans l'AudioWorkletGlobalScope (thread audio). Il accumule les
 * échantillons mono jusqu'à ~20 ms puis les poste au thread principal, qui
 * rééchantillonne vers 16 kHz et envoie au serveur. On ne fait PAS le
 * rééchantillonnage ici pour garder le worklet simple et sans dépendance.
 */

// Déclarations minimales du contexte worklet (absent des libs TS par défaut).
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;

// ~20 ms de signal avant chaque envoi (compromis latence / nombre de messages).
const FRAME_MS = 20;

class CaptureProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private offset = 0;
  private readonly frameSize: number;

  constructor() {
    super();
    this.frameSize = Math.round((sampleRate * FRAME_MS) / 1000);
    this.buffer = new Float32Array(this.frameSize);
  }

  override process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.offset++] = channel[i] ?? 0;
      if (this.offset >= this.frameSize) {
        // Copie transférée au thread principal (sampleRate joint pour le resample).
        const frame = this.buffer.slice(0, this.offset);
        this.port.postMessage({ samples: frame, sampleRate }, [frame.buffer]);
        this.buffer = new Float32Array(this.frameSize);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);

// `export {}` : fichier traité comme module → les `declare` ci-dessus restent
// locaux (pas de collision de portée globale avec l'autre worklet).
export {};
