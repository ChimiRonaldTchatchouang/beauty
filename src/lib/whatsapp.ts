import "server-only";

// Envoi d'un document (PDF) via l'API WhatsApp Business Cloud (Meta).
// Nécessite WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (+ éventuellement
// WHATSAPP_API_VERSION). Sans ça, l'app retombe sur un lien wa.me.

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppDocument(opts: {
  to: string; // numéro au format international, chiffres uniquement
  link: string; // URL publique du PDF
  filename: string;
  caption?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  if (!token || !phoneId) return { ok: false, error: "WhatsApp API non configurée" };

  const to = opts.to.replace(/[^\d]/g, "");
  if (!to) return { ok: false, error: "Numéro WhatsApp manquant" };

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: { link: opts.link, filename: opts.filename, caption: opts.caption },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true, id: data?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
