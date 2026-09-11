/**
 * Détection LOCALE de fin de parole (VAD) par énergie, côté navigateur.
 *
 * Sert uniquement à MESURER la latence : on repère le moment où l'appelant
 * arrête de parler (silence d'environ 500 ms sous un seuil d'énergie), afin de
 * chronométrer le délai jusqu'au premier échantillon audio joué par l'assistant.
 * (La vraie détection de tour de parole reste faite par le VAD serveur de Gemini.)
 */
export class LocalVad {
  private speaking = false;
  private silenceStart = 0;
  private hadSpeech = false;

  constructor(
    private readonly onSpeechEnd: () => void,
    /** Seuil d'énergie (RMS) au-dessus duquel on considère qu'il y a de la parole. */
    private readonly energyThreshold = 0.012,
    /** Durée de silence (ms) confirmant la fin de parole. */
    private readonly silenceMs = 500,
  ) {}

  /** Alimente le VAD avec une trame Float32 (au rythme de la capture). */
  push(frame: Float32Array): void {
    const rms = computeRms(frame);
    const now = performance.now();
    if (rms >= this.energyThreshold) {
      this.speaking = true;
      this.hadSpeech = true;
      this.silenceStart = 0;
    } else if (this.speaking) {
      if (this.silenceStart === 0) {
        this.silenceStart = now;
      } else if (now - this.silenceStart >= this.silenceMs && this.hadSpeech) {
        // Fin de parole confirmée.
        this.speaking = false;
        this.hadSpeech = false;
        this.silenceStart = 0;
        this.onSpeechEnd();
      }
    }
  }
}

/** Énergie RMS d'une trame. */
export function computeRms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const s = frame[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / frame.length);
}
