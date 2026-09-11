import { describe, it, expect, vi } from 'vitest';
import { VerificationStore } from './verification.js';

describe('VerificationStore', () => {
  it('valide le bon code', () => {
    const store = new VerificationStore();
    const code = store.generate('c1');
    expect(store.verify('c1', code)).toEqual({ ok: true });
    expect(store.isVerified('c1')).toBe(true);
  });

  it('rejette un mauvais code et décrémente les essais', () => {
    const store = new VerificationStore();
    store.generate('c1');
    const r = store.verify('c1', '0000');
    expect(r.ok).toBe(false);
    expect(r.attemptsLeft).toBe(2);
  });

  it('bloque après 3 essais', () => {
    const store = new VerificationStore();
    store.generate('c1');
    store.verify('c1', 'aaaa');
    store.verify('c1', 'bbbb');
    const third = store.verify('c1', 'cccc');
    expect(third.ok).toBe(false);
    expect(third.attemptsLeft).toBe(0);
    // Un 4e essai (même correct) est refusé.
    expect(store.verify('c1', '9999').reason).toBe('too_many_attempts');
  });

  it('expire le code après 5 minutes', () => {
    vi.useFakeTimers();
    const store = new VerificationStore();
    store.generate('c1');
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(store.verify('c1', '1234').reason).toBe('expired');
    expect(store.isVerified('c1')).toBe(false);
    vi.useRealTimers();
  });

  it('renvoie no_code si aucun code généré', () => {
    const store = new VerificationStore();
    expect(store.verify('inconnu', '1234').reason).toBe('no_code');
  });
});
