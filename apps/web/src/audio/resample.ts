/**
 * Utilitaires audio (navigateur) : conversion PCM16 ⇄ Float32 et
 * rééchantillonnage par interpolation linéaire.
 *
 * Le micro capture en général à 48 kHz ; Gemini attend du 16 kHz en entrée.
 * L'assistant renvoie du 24 kHz que l'on joue via un AudioContext à 24 kHz.
 * Ces fonctions sont pures et testées unitairement (voir tests J7).
 */

/** Float32 [-1,1] → PCM16 little-endian (Int16Array). */
export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    // Asymétrie -32768..32767 : on borne pour éviter le débordement.
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** PCM16 (Int16Array) → Float32 [-1,1]. */
export function pcm16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const v = input[i] ?? 0;
    out[i] = v < 0 ? v / 0x8000 : v / 0x7fff;
  }
  return out;
}

/**
 * Rééchantillonnage par interpolation linéaire.
 * Suffisant et léger pour de la voix téléphonique ; pas de filtre anti-repliement
 * élaboré (on reste sur du mono voix).
 */
export function resampleLinear(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate || input.length === 0) return input;
  const ratio = inRate / outRate;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = (input[i0] ?? 0) * (1 - frac) + (input[i1] ?? 0) * frac;
  }
  return out;
}

/** Raccourci : rééchantillonne vers 16 kHz puis convertit en PCM16. */
export function toPcm16k(input: Float32Array, inRate: number): Int16Array {
  return floatToPcm16(resampleLinear(input, inRate, 16000));
}

/** Convertit un ArrayBuffer de PCM16 en Float32 (pour la lecture). */
export function pcm16BufferToFloat(buffer: ArrayBuffer): Float32Array {
  return pcm16ToFloat(new Int16Array(buffer));
}
