import { describe, it, expect } from 'vitest';
import { floatToPcm16, pcm16ToFloat, resampleLinear, toPcm16k } from './resample.js';

describe('conversion PCM16 ⇄ Float32', () => {
  it('convertit et reconvertit sans perte notable', () => {
    const input = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
    const pcm = floatToPcm16(input);
    const back = pcm16ToFloat(pcm);
    for (let i = 0; i < input.length; i++) {
      expect(back[i]!).toBeCloseTo(input[i]!, 2);
    }
  });

  it('borne les valeurs hors [-1, 1]', () => {
    const pcm = floatToPcm16(new Float32Array([2, -2]));
    expect(pcm[0]).toBe(32767);
    expect(pcm[1]).toBe(-32768);
  });
});

describe('rééchantillonnage linéaire', () => {
  it('48 kHz → 16 kHz divise la longueur par 3', () => {
    const input = new Float32Array(48000).fill(0.1);
    const out = resampleLinear(input, 48000, 16000);
    expect(out.length).toBe(16000);
  });

  it('24 kHz → 48 kHz double la longueur', () => {
    const input = new Float32Array(240).fill(0.2);
    const out = resampleLinear(input, 24000, 48000);
    expect(out.length).toBe(480);
  });

  it('renvoie l\'entrée si les fréquences sont identiques', () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    expect(resampleLinear(input, 16000, 16000)).toBe(input);
  });

  it('toPcm16k produit du PCM16 à 16 kHz depuis du 48 kHz', () => {
    const input = new Float32Array(4800).fill(0.5); // 100 ms à 48 kHz
    const pcm = toPcm16k(input, 48000);
    expect(pcm).toBeInstanceOf(Int16Array);
    expect(pcm.length).toBe(1600); // 100 ms à 16 kHz
    expect(pcm[0]).toBeCloseTo(0.5 * 0x7fff, -2);
  });
});
