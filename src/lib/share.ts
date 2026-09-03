import "server-only";
import crypto from "node:crypto";

// Jeton signé pour partager un rapport en lien public (sans connexion).
// HMAC(scanId, AUTH_SECRET) → non devinable, vérifiable côté serveur.
function key(): string {
  return process.env.AUTH_SECRET ?? "dev-secret";
}

export function shareToken(scanId: string): string {
  const sig = crypto.createHmac("sha256", key()).update(scanId).digest("base64url").slice(0, 20);
  return `${scanId}.${sig}`;
}

export function verifyShareToken(token: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const id = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac("sha256", key()).update(id).digest("base64url").slice(0, 20);
  // Comparaison à temps constant.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return id;
}

export function reportShareUrl(scanId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/r/${shareToken(scanId)}`;
}

// Lien direct vers le vrai fichier PDF (téléchargement / WhatsApp / email).
export function reportPdfUrl(scanId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/report/${shareToken(scanId)}`;
}
