"use client";

import { I18nProvider } from "@/lib/i18n/context";
import { AnnotatedScan } from "@/components/views/AnnotatedScan";
import { MetricRing } from "@/components/Score";
import { severityColor } from "@/lib/colors";
import { categoryColor, categoryLabel } from "@/lib/categories";
import type { ScanAnalysis, Routine, Severity } from "@/lib/db/schema";

const SEV_LABEL: Record<Severity, string> = {
  none: "Absent",
  low: "Léger",
  medium: "Modéré",
  high: "À surveiller",
};
const SEV_LEVEL: Record<Severity, string> = { none: "0/5", low: "2/5", medium: "3/5", high: "4/5" };
const PHOTO_LABEL = ["Face", "Profil gauche", "Profil droit", "Vue du bas"];

export function ScanReport({
  centerName,
  centerLogo,
  patientLabel,
  date,
  scanRef,
  analysis,
  routine,
  image,
  images,
  photoQualities,
}: {
  centerName: string;
  centerLogo: string | null;
  patientLabel: string;
  date: string;
  scanRef: string;
  analysis: ScanAnalysis;
  routine: Routine | null;
  image: string | null;
  images: string[] | null;
  photoQualities: { ok?: boolean; reason?: string }[] | null;
}) {
  const dateStr = new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <I18nProvider initialLang="fr">
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <a href="../" className="text-sm font-medium text-ink-soft">← Retour</a>
        <button onClick={() => window.print()} className="btn-primary">📄 Télécharger le PDF</button>
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
              <p className="text-xs text-ink-faint">Rapport d'analyse cutanée par IA · {scanRef}</p>
            </div>
          </div>
          <div className="text-right text-xs text-ink-faint">
            <p className="font-semibold text-ink">{patientLabel}</p>
            <p>{dateStr}</p>
          </div>
        </div>

        {/* Score + photo + type de peau */}
        <div className="mt-5 grid gap-5 sm:grid-cols-[210px_1fr] print-avoid-break">
          <div>{image && <AnnotatedScan image={image} images={images} metrics={analysis.metrics} />}</div>
          <div>
            <p className="text-sm text-ink-soft">Score global de santé de la peau</p>
            <p className="mt-1 text-4xl font-bold" style={{ color: severityColor(analysis.overallScore >= 80 ? "none" : analysis.overallScore >= 60 ? "low" : analysis.overallScore >= 40 ? "medium" : "high") }}>
              {analysis.overallScore}<span className="text-lg text-ink-faint"> / 100</span>
            </p>
            <div className="score-track mt-2"><div className="score-fill" style={{ width: `${Math.max(4, analysis.overallScore)}%` }} /></div>
            {analysis.skinType && (
              <p className="mt-3 text-sm"><span className="text-ink-faint">Type de peau estimé : </span><strong>{analysis.skinType}</strong></p>
            )}
            <p className="mt-2 text-sm text-ink-soft">{analysis.summary}</p>
          </div>
        </div>

        {/* Priorités */}
        {analysis.priorities && analysis.priorities.length > 0 && (
          <div className="mt-6 print-avoid-break">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Par où commencer — priorités</h2>
            <div className="flex flex-col gap-2">
              {analysis.priorities.map((p, i) => (
                <div key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-grad-brand text-xs font-bold text-white">{i + 1}</span>
                  <div><span className="font-semibold">{p.title}</span><p className="text-xs text-ink-soft">{p.why}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anneaux */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-sand-100 pt-5 print-avoid-break">
          {analysis.metrics.map((m) => (
            <MetricRing key={m.category} score={m.score} color={categoryColor(m.category)} title={categoryLabel(m.category)} subtitle={SEV_LABEL[m.severity as Severity]} />
          ))}
        </div>

        {/* Tableau détaillé */}
        <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Analyse détaillée</h2>
        <div className="overflow-hidden rounded-2xl border border-sand-100">
          {analysis.metrics.map((m) => (
            <div key={m.category} className="flex gap-3 border-b border-sand-100 p-3 last:border-0 print-avoid-break">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: severityColor(m.severity as Severity) }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-semibold">{categoryLabel(m.category)}</span>
                  <span className="text-xs text-ink-faint">{SEV_LABEL[m.severity as Severity]} · {SEV_LEVEL[m.severity as Severity]} · {m.zone}</span>
                </div>
                <p className="text-xs text-ink-soft">{m.explanation}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Routine */}
        {routine && (
          <div className="mt-6 print-avoid-break">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Routine personnalisée</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <RoutineCol title="🌅 Matin" steps={routine.morning} />
              <RoutineCol title="🌙 Soir" steps={routine.evening} />
            </div>
            {routine.shaving && routine.shaving.length > 0 && (
              <div className="mt-4"><RoutineCol title="🪒 Jours de rasage — protocole anti-irritation" steps={routine.shaving} /></div>
            )}
          </div>
        )}

        {/* Conseils */}
        {routine && routine.tips.length > 0 && (
          <div className="mt-6 print-avoid-break">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Conseils complémentaires</h2>
            <ul className="flex flex-col gap-1">
              {routine.tips.map((t, i) => (
                <li key={i} className="text-sm"><span className="font-semibold">{t.title} : </span><span className="text-ink-soft">{t.body}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Fiabilité des photos */}
        {photoQualities && photoQualities.length > 0 && (
          <div className="mt-6 print-avoid-break">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Fiabilité du scan</h2>
            <div className="overflow-hidden rounded-2xl border border-sand-100">
              {photoQualities.map((q, i) => (
                <div key={i} className="flex items-center justify-between border-b border-sand-100 p-2.5 text-sm last:border-0">
                  <span className="font-medium">{PHOTO_LABEL[i] ?? `Photo ${i + 1}`}</span>
                  <span className={q.ok ? "text-green-600" : "text-amber-600"}>
                    {q.ok ? "Valide" : `Partiellement valide${q.reason ? ` (${q.reason})` : ""}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 border-t border-sand-100 pt-3 text-center text-[11px] text-ink-faint">
          Analyse cosmétique à visée esthétique générée par IA — ne constitue pas un diagnostic médical et ne remplace
          pas l'avis d'un dermatologue. Photos traitées de façon sécurisée, suppression possible à tout moment.
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
