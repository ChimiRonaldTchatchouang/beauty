import { describe, it, expect } from 'vitest';
import { applyPhoneBandpass, toPhoneQualityPcm16k } from './phoneFilter.js';
import { computeRms } from './localVad.js';

/** Génère une sinusoïde de fréquence donnée. */
function sine(freq: number, rate: number, samples: number): Float32Array {
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / rate);
  return out;
}

describe('filtre passe-bande « qualité téléphone » (300–3400 Hz)', () => {
  const rate = 48000;
  const n = 4800;

  it('atténue fortement une fréquence basse hors bande (60 Hz)', () => {
    const input = sine(60, rate, n);
    const out = applyPhoneBandpass(input, rate);
    // On ignore le régime transitoire du filtre (début du signal).
    const inRms = computeRms(input.slice(1000));
    const outRms = computeRms(out.slice(1000));
    expect(outRms).toBeLessThan(inRms * 0.5);
  });

  it('atténue une fréquence haute hors bande (8000 Hz)', () => {
    const input = sine(8000, rate, n);
    const out = applyPhoneBandpass(input, rate);
    expect(computeRms(out.slice(1000))).toBeLessThan(computeRms(input.slice(1000)) * 0.6);
  });

  it('préserve l\'essentiel d\'une fréquence dans la bande (1000 Hz)', () => {
    const input = sine(1000, rate, n);
    const out = applyPhoneBandpass(input, rate);
    expect(computeRms(out.slice(1000))).toBeGreaterThan(computeRms(input.slice(1000)) * 0.6);
  });

  it('toPhoneQualityPcm16k renvoie du PCM16 à 16 kHz', () => {
    const input = sine(1000, rate, n); // 100 ms
    const pcm = toPhoneQualityPcm16k(input, rate);
    expect(pcm).toBeInstanceOf(Int16Array);
    expect(pcm.length).toBe(1600); // 100 ms à 16 kHz
  });
});
