"use client";

import { I18nProvider } from "@/lib/i18n/context";
import { AnnotatedScan } from "@/components/views/AnnotatedScan";
import { MetricRing } from "@/components/Score";
import { categoryColor, scoreColor, severityColor } from "@/lib/colors";
import type { ScanAnalysis, Routine, Severity } from "@/lib/db/schema";

const CATEGORY_LABEL: Record<string, string> = {
  acne: "Acné / imperfections",
  dark_spots: "Taches pigmentaires",
  wrinkles: "Rides & ridules",
  pores: "Pores dilatés",
  redness: "Rougeurs",
  hydration: "Hydratation",
  evenness: "Uniformité du teint",
};
const SEV_LABEL: Record<Severity, string> = {
  none: "Très bien",
  low: "Léger",
  medium: "Modéré",
  high: "À surveiller",
};

export function ScanReport({
  centerName,
  centerLogo,
  patientLabel,
  date,
  analysis,
  routine,
  image,
  images,
}: {
  centerName: string;
  centerLogo: string | null;
  patientLabel: string;
  date: string;
  analysis: ScanAnalysis;
  routine: Routine | null;
  image: string | null;
  images: string[] | null;
}) {
  return (
    <I18nProvider initialLang="fr">
      {/* Barre d'action (masquée à l'impression) */}
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <a href="./" className="text-sm font-medium text-ink-soft">← Retour</a>
        <button onClick={() => window.print()} className="btn-primary">
          📄 Télécharger le PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl rounded-[26px] bg-white p-6 shadow-card print:shadow-none">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-sand-100 pb-4">
          <div className="flex items-center gap-3">
            {centerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={centerLogo} alt={centerName} className="h-10 w-auto" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-grad-brand text-white">✦</span>
            )}
            <div>
              <p className="font-bold">{centerName}</p>
              <p className="text-xs text-ink-faint">Rapport d'analyse cutanée</p>
            </div>
          </div>
          <div className="text-right text-xs text-ink-faint">
            <p className="font-semibold text-ink">{patientLabel}</p>
            <p>{new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Photo + score */}
        <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr] print-avoid-break">
          <div>{image && <AnnotatedScan image={image} images={images} metrics={analysis.metrics} />}</div>
          <div>
            <p className="text-sm text-ink-soft">Score global de santé de la peau</p>
            <p className="mt-1 text-4xl font-bold" style={{ color: scoreColor(analysis.overallScore) }}>
              {analysis.overallScore}
              <span className="text-lg text-ink-faint"> / 100</span>
            </p>
            <div className="score-track mt-2">
              <div className="score-fill" style={{ width: `${Math.max(4, analysis.overallScore)}%` }} />
            </div>
            <p className="mt-3 text-sm text-ink-soft">{analysis.summary}</p>
          </div>
        </div>

        {/* Anneaux */}
        <div className="mt-6 grid grid-cols-4 gap-4 border-t border-sand-100 pt-5 print-avoid-break">
          {analysis.metrics.map((m) => (
            <MetricRing
              key={m.category}
              score={m.score}
              color={categoryColor(m.category)}
              title={CATEGORY_LABEL[m.category] ?? m.category}
              subtitle={SEV_LABEL[m.severity as Severity]}
            />
          ))}
        </div>

        {/* Détail par critère */}
        <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Détail par critère</h2>
        <div className="overflow-hidden rounded-2xl border border-sand-100">
          {analysis.metrics.map((m) => (
            <div key={m.category} className="flex gap-3 border-b border-sand-100 p-3 last:border-0 print-avoid-break">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: severityColor(m.severity as Severity) }} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between">
                  <span className="font-semibold">{CATEGORY_LABEL[m.category] ?? m.category}</span>
                  <span className="font-bold" style={{ color: categoryColor(m.category) }}>{m.score}/100</span>
                </div>
                <p className="text-xs text-ink-soft">{m.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Routine */}
        {routine && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 print-avoid-break">
            <RoutineCol title="🌅 Routine matin" steps={routine.morning} />
            <RoutineCol title="🌙 Routine soir" steps={routine.evening} />
          </div>
        )}

        <p className="mt-6 border-t border-sand-100 pt-3 text-center text-[11px] text-ink-faint">
          Analyse cosmétique à visée esthétique — ne constitue pas un diagnostic médical.
          Généré par {centerName} via SkinScan.
        </p>
      </div>
    </I18nProvider>
  );
}

function RoutineCol({ title, steps }: { title: string; steps: Routine["morning"] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold">{title}</p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((s) => (
          <li key={s.order} className="text-sm">
            <span className="font-semibold">{s.order}. {s.title}</span>
            {s.keyIngredient && <span className="text-ink-faint"> — {s.keyIngredient}</span>}
            <p className="text-xs text-ink-faint">{s.reason} · {s.frequency}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
