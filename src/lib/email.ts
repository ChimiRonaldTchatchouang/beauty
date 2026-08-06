import "server-only";
import type { ScanAnalysis, Routine } from "./db/schema";

// Envoi d'emails via l'API HTTP de Resend (pas de SDK → une dépendance en moins).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return { ok: false, error: "RESEND non configuré" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true, id: (data as { id?: string }).id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "#3fa66a";
  if (score >= 60) return "#8bbf4d";
  if (score >= 40) return "#e0a92e";
  return "#d95b3c";
}

const CATEGORY_LABEL: Record<string, string> = {
  acne: "Acné / imperfections",
  dark_spots: "Taches pigmentaires",
  wrinkles: "Rides & ridules",
  pores: "Pores dilatés",
  redness: "Rougeurs",
  hydration: "Hydratation",
  evenness: "Uniformité du teint",
};

/** Template HTML des résultats envoyés au patient (brandé au centre). */
export function resultEmailHtml(opts: {
  patientName: string | null;
  centerName: string;
  centerLogo?: string | null;
  brandColor?: string | null;
  analysis: ScanAnalysis;
  routine: Routine | null;
  portalUrl: string;
}): string {
  const brand = opts.brandColor || "#d95b3c";
  const metrics = opts.analysis.metrics
    .map(
      (m) => `
      <tr>
        <td style="padding:8px 0;color:#2a2320;font-size:14px;">${CATEGORY_LABEL[m.category] ?? m.category}</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;color:${scoreColor(m.score)};font-size:14px;">${m.score}/100</td>
      </tr>`,
    )
    .join("");

  const morning = (opts.routine?.morning ?? [])
    .map((s) => `<li style="margin:4px 0;color:#4a423d;font-size:14px;">${s.title}</li>`)
    .join("");
  const evening = (opts.routine?.evening ?? [])
    .map((s) => `<li style="margin:4px 0;color:#4a423d;font-size:14px;">${s.title}</li>`)
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#faf7f4;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:16px 0;">
      ${opts.centerLogo ? `<img src="${opts.centerLogo}" alt="${opts.centerName}" style="max-height:56px;margin-bottom:8px;" />` : ""}
      <div style="font-weight:700;color:#2a2320;font-size:18px;">${opts.centerName}</div>
    </div>
    <div style="background:#fff;border-radius:20px;padding:28px;box-shadow:0 6px 24px -8px rgba(42,35,32,.18);">
      <h1 style="margin:0 0 6px;font-size:20px;color:#2a2320;">Bonjour ${opts.patientName ?? ""} 👋</h1>
      <p style="margin:0 0 20px;color:#6b615b;font-size:14px;line-height:1.5;">Voici les résultats de votre analyse de peau réalisée à ${opts.centerName}.</p>

      <div style="text-align:center;margin:8px 0 20px;">
        <div style="display:inline-block;width:96px;height:96px;border-radius:50%;background:${scoreColor(opts.analysis.overallScore)};color:#fff;line-height:96px;font-size:32px;font-weight:800;">${opts.analysis.overallScore}</div>
        <div style="color:#6b615b;font-size:13px;margin-top:8px;">Score global · ${opts.analysis.summary}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;border-top:1px solid #f0e8e0;">${metrics}</table>

      ${
        opts.routine
          ? `<div style="margin-top:20px;">
              <h2 style="font-size:15px;color:#2a2320;margin:0 0 8px;">🌅 Routine matin</h2>
              <ul style="margin:0 0 12px;padding-left:18px;">${morning}</ul>
              <h2 style="font-size:15px;color:#2a2320;margin:0 0 8px;">🌙 Routine soir</h2>
              <ul style="margin:0;padding-left:18px;">${evening}</ul>
            </div>`
          : ""
      }

      <div style="text-align:center;margin-top:24px;">
        <a href="${opts.portalUrl}" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px;font-size:15px;">Voir mon suivi complet</a>
      </div>
      <p style="margin:18px 0 0;color:#a49a92;font-size:12px;text-align:center;line-height:1.5;">Analyse cosmétique — aucun diagnostic médical. Connectez-vous avec Google (même adresse email) pour retrouver votre historique.</p>
    </div>
  </div>
</body></html>`;
}
