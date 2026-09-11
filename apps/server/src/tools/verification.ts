/**
 * Vérification de l'appelant par code à 4 chiffres, EN MÉMOIRE, par appel.
 * - Code valable 5 minutes.
 * - 3 essais maximum.
 * Aucune donnée sensible réelle : code de démonstration uniquement.
 */

interface Entry {
  code: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export class VerificationStore {
  private readonly byCall = new Map<string, Entry>();

  /** Génère un code à 4 chiffres et l'enregistre pour cet appel. */
  generate(callId: string): string {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    this.byCall.set(callId, { code, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0, verified: false });
    return code;
  }

  /** Vérifie un code. Renvoie le résultat détaillé pour le modèle. */
  verify(callId: string, code: string): { ok: boolean; reason?: string; attemptsLeft?: number } {
    const entry = this.byCall.get(callId);
    if (!entry) return { ok: false, reason: 'no_code' };
    if (Date.now() > entry.expiresAt) {
      this.byCall.delete(callId);
      return { ok: false, reason: 'expired' };
    }
    if (entry.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

    entry.attempts++;
    if (code.trim() === entry.code) {
      entry.verified = true;
      return { ok: true };
    }
    const attemptsLeft = MAX_ATTEMPTS - entry.attempts;
    if (attemptsLeft <= 0) return { ok: false, reason: 'too_many_attempts', attemptsLeft: 0 };
    return { ok: false, reason: 'wrong_code', attemptsLeft };
  }

  isVerified(callId: string): boolean {
    const entry = this.byCall.get(callId);
    return !!entry?.verified && Date.now() <= entry.expiresAt;
  }

  clear(callId: string): void {
    this.byCall.delete(callId);
  }
}
