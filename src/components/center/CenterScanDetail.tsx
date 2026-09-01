"use client";

import { useState } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import { ResultsView } from "@/components/views/ResultsView";
import { RoutineView } from "@/components/views/RoutineView";
import { sendResults } from "@/lib/actions/center";
import type { ScanAnalysis, Routine } from "@/lib/db/schema";

export function CenterScanDetail({
  scanId,
  patientLabel,
  analysis,
  routine,
  image,
  images,
  emailed,
  date,
}: {
  scanId: string;
  patientLabel: string;
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
  const [error, setError] = useState<string | null>(null);

  async function doSend() {
    setSending(true);
    setError(null);
    const res = await sendResults(scanId);
    setSending(false);
    if (res.ok) setSent(true);
    else setError(res.error ?? "Échec de l'envoi.");
  }

  return (
    <I18nProvider initialLang="fr">
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{patientLabel}</h1>
        <div className="flex gap-2">
          <a href={`/center/scans/${scanId}/report`} className="btn-ghost">
            📄 PDF
          </a>
          <button onClick={doSend} disabled={sending} className="btn-primary">
            {sent ? "✓ Renvoyer l'email" : sending ? "Envoi…" : "📧 Envoyer au patient"}
          </button>
        </div>
      </div>
      {error && <p className="mb-3 rounded-2xl bg-brand-50 p-3 text-sm text-brand-700">{error}</p>}
      {sent && !error && (
        <p className="mb-3 rounded-2xl bg-green-50 p-3 text-sm text-green-700">Résultats envoyés au patient.</p>
      )}

      <div className="mb-5 inline-flex rounded-2xl bg-sand-100 p-1">
        {(["results", "routine"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${tab === k ? "bg-white shadow-soft" : "text-ink-faint"}`}
          >
            {k === "results" ? "Résultats" : "Routine"}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        <ResultsView analysis={analysis} image={image} images={images} showRoutineCta={false} date={date} />
      ) : (
        <RoutineView routine={routine} />
      )}
    </I18nProvider>
  );
}
