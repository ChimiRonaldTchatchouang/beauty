/**
 * Génération de tonalités en Web Audio, sans aucun fichier audio externe.
 * - Sonnerie (ringback) : ~425 Hz, cadence 1,5 s actif / 3 s silence.
 * - Bip d'erreur : deux courts bips (quota dépassé / coupure).
 */
export class Tones {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private cadence: number | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    void this.ctx.resume();
    return this.ctx;
  }

  /** Démarre la sonnerie (ringback) avec cadence. */
  startRinging(): void {
    const ctx = this.ensureCtx();
    this.stopRinging();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 425; // tonalité d'appel usuelle
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    this.osc = osc;
    this.gain = gain;

    const ring = () => {
      const t = ctx.currentTime;
      // 1,5 s de tonalité puis 3 s de silence.
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.setValueAtTime(0, t + 1.5);
    };
    ring();
    this.cadence = window.setInterval(ring, 4500);
  }

  stopRinging(): void {
    if (this.cadence !== null) {
      clearInterval(this.cadence);
      this.cadence = null;
    }
    try {
      this.osc?.stop();
    } catch {
      /* déjà arrêté */
    }
    this.osc?.disconnect();
    this.gain?.disconnect();
    this.osc = null;
    this.gain = null;
  }

  /** Deux courts bips (erreur/quota). */
  errorBeep(): void {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 480;
    osc.connect(gain).connect(ctx.destination);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    for (const start of [0, 0.25]) {
      gain.gain.setValueAtTime(0.15, t + start);
      gain.gain.setValueAtTime(0, t + start + 0.15);
    }
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /** Libère le contexte audio. */
  dispose(): void {
    this.stopRinging();
    void this.ctx?.close();
    this.ctx = null;
  }
}
