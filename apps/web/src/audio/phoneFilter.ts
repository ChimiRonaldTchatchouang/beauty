import { floatToPcm16, resampleLinear } from './resample.js';

/**
 * Mode « qualité téléphone » : simule un vrai appel mobile.
 *
 * Chaîne : passe-bande 300–3400 Hz → décimation à 8 kHz → remontée à 16 kHz.
 * On limite ainsi la bande passante comme une ligne téléphonique classique,
 * pour tester l'assistant dans des conditions réalistes.
 *
 * Le passe-bande est un cascade de deux biquads (RBJ cookbook) : un passe-haut
 * à 300 Hz et un passe-bas à 3400 Hz. Fonctions pures (testées au J7).
 */

interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const Q = Math.SQRT1_2; // 0.707, réponse maximalement plate (Butterworth)

function highpassCoeffs(freq: number, rate: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * freq) / rate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha;
  return {
    b0: ((1 + cos) / 2) / a0,
    b1: (-(1 + cos)) / a0,
    b2: ((1 + cos) / 2) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

function lowpassCoeffs(freq: number, rate: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * freq) / rate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha;
  return {
    b0: ((1 - cos) / 2) / a0,
    b1: (1 - cos) / a0,
    b2: ((1 - cos) / 2) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

/** Applique un biquad en Direct Form I. */
function applyBiquad(input: Float32Array, c: BiquadCoeffs): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i] ?? 0;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

/** Passe-bande téléphonique 300–3400 Hz. */
export function applyPhoneBandpass(input: Float32Array, rate: number): Float32Array {
  const hp = applyBiquad(input, highpassCoeffs(300, rate));
  return applyBiquad(hp, lowpassCoeffs(3400, rate));
}

/**
 * Chaîne complète « qualité téléphone » → PCM16 16 kHz prêt à envoyer.
 * On passe explicitement par 8 kHz (bande téléphonique) avant de remonter à 16 kHz.
 */
export function toPhoneQualityPcm16k(input: Float32Array, inRate: number): Int16Array {
  const filtered = applyPhoneBandpass(input, inRate);
  const at8k = resampleLinear(filtered, inRate, 8000);
  const at16k = resampleLinear(at8k, 8000, 16000);
  return floatToPcm16(at16k);
}
