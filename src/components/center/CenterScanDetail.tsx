"use client";

import { useState } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import { ResultsView } from "@/components/views/ResultsView";
import { RoutineView } from "@/components/views/RoutineView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { sendResults, sendWhatsappReport } from "@/lib/actions/center";
import type { ScanAnalysis, Routine } from "@/lib/db/schema";

export function CenterScanDetail({
  scanId,
  patientLabel,
  patientPhone,
  centerName,
  reportUrl,
  whatsappAuto,
  analysis,
  routine,
  image,
  images,
  emailed,
  date,
}: {
  scanId: string;
  patientLabel: string;
  patientPhone?: string | null;
  centerName?: string;
  reportUrl?: string;
  whatsappAuto?: boolean;
  analysis: ScanAnalysis;
  routine: Routine | null;
  image: string | null;
  images?: string[] | null;
  emailed: boolean;
  date: string;
}) {
  const [tab, setTab] = useState<"results" | "routine">("results");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(emailed);
  const [waSending, setWaSending] = useState(false);
  const [waSent, setWaSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doSend() {
    setSending(true);
    setError(null);
    const res = await sendResults(scanId);
    setSending(false);
    if (res.ok) setSent(true);
    else setError(res.error ?? "Échec de l'envoi.");
  }

  const digits = (patientPhone ?? "").replace(/[^\d]/g, "");
  const waLinkHref = (() => {
    if (!digits) return null;
    const prio = analysis.priorities?.[0]?.title;
    const msg =
      `Bonjour, voici votre analyse de peau chez ${centerName ?? "notre centre"} : ` +
      `score global ${analysis.overallScore}/100${analysis.skinType ? ` (peau ${analysis.skinType})` : ""}. ` +
      `${prio ? `Priorité : ${prio}. ` : ""}` +
      `${reportUrl ? `\n\n📄 Votre rapport (PDF) : ${reportUrl}` : ""}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  })();

  // Envoi auto du PDF via l'API WhatsApp Cloud (si configurée).
  async function doWhatsapp() {
    setWaSending(true);
    setError(null);
    const res = await sendWhatsappReport(scanId);
    setWaSending(false);
    if (res.ok) setWaSent(true);
    else setError(res.error === "whatsapp_not_configured" ? "API WhatsApp non configurée." : res.error ?? "Échec WhatsApp.");
  }

  return (
    <I18nProvider initialLang="fr">
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{patientLabel}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={reportUrl ?? `/center/scans/${scanId}/report`} target="_blank" rel="noopener noreferrer">📄 PDF</a>
          </Button>
          {digits &&
            (whatsappAuto ? (
              <Button onClick={doWhatsapp} disabled={waSending || waSent} variant="outline" size="sm" className="text-green-700">
                {waSent ? "✓ PDF envoyé" : waSending ? "Envoi…" : "💬 Envoyer le PDF"}
              </Button>
            ) : (
              waLinkHref && (
                <Button asChild variant="outline" size="sm" className="text-green-700">
                  <a href={waLinkHref} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
                </Button>
              )
            ))}
          <Button onClick={doSend} disabled={sending} size="sm">
            {sent ? "✓ Renvoyer l'email" : sending ? "Envoi…" : "📧 Email"}
          </Button>
        </div>
      </div>
      {error && <p className="mb-3 rounded-2xl bg-brand-50 p-3 text-sm text-brand-700">{error}</p>}
      {sent && !error && (
        <p className="mb-3 rounded-2xl bg-green-50 p-3 text-sm text-green-700">Résultats envoyés au patient.</p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "results" | "routine")}>
        <TabsList>
          <TabsTrigger value="results">Résultats</TabsTrigger>
          <TabsTrigger value="routine">Routine</TabsTrigger>
        </TabsList>
        <TabsContent value="results">
          <ResultsView analysis={analysis} image={image} images={images} showRoutineCta={false} date={date} />
        </TabsContent>
        <TabsContent value="routine">
          <RoutineView routine={routine} />
        </TabsContent>
      </Tabs>
    </I18nProvider>
  );
}
