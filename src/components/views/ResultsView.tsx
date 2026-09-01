"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { MetricRing, ScoreBar, SeverityDot, categoryColor, scoreColor } from "@/components/Score";
import { AnnotatedScan } from "./AnnotatedScan";
import type { ScanAnalysis, Severity } from "@/lib/db/schema";

const ZONE_LABEL: Record<string, { fr: string; en: string }> = {
  front: { fr: "Front", en: "Forehead" },
  joues: { fr: "Joues", en: "Cheeks" },
  nez: { fr: "Nez", en: "Nose" },
  menton: { fr: "Menton", en: "Chin" },
  contour_yeux: { fr: "Contour des yeux", en: "Eye area" },
  global: { fr: "Visage entier", en: "Whole face" },
};

function overallLabel(score: number, lang: "fr" | "en"): string {
  if (lang === "fr") {
    if (score >= 80) return "Excellent";
    if (score >= 65) return "Bien";
    if (score >= 50) return "Moyen";
    return "À améliorer";
  }
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Average";
  return "Needs care";
}

export function ResultsView({
  analysis,
  image,
  images,
  showRoutineCta = true,
  date,
}: {
  analysis: ScanAnalysis;
  image?: string | null;
  images?: string[] | null;
  showRoutineCta?: boolean;
  date?: string | Date;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="animate-fade-in lg:grid lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-8">
      {/* Colonne gauche : photo annotée + score global */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        {image && <AnnotatedScan image={image} images={images} metrics={analysis.metrics} />}

        <div className="card mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-ink-soft">{t.results.overall}</p>
            <p className="text-sm font-bold">
              <span className="text-2xl" style={{ color: scoreColor(analysis.overallScore) }}>
                {analysis.overallScore}
              </span>
              <span className="text-ink-faint"> / 100</span>
            </p>
          </div>
          <div className="score-track">
            <div className="score-fill" style={{ width: `${Math.max(4, analysis.overallScore)}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {overallLabel(analysis.overallScore, lang)}
            </span>
            {date && (
              <span className="text-xs text-ink-faint">
                {new Date(date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-ink-soft">{analysis.summary}</p>
        </div>

        {showRoutineCta && (
          <Link href="/routine" className="btn-primary mt-4 hidden w-full lg:flex">
            {t.scan.seeRoutine}
          </Link>
        )}
      </div>

      {/* Colonne droite : anneaux + détails + reco IA */}
      <div className="mt-6 lg:mt-0">
        {/* Anneaux colorés par critère */}
        <div className="card mb-5">
          <p className="mb-4 font-semibold">{t.results.details}</p>
          <div className="grid grid-cols-4 gap-y-4 sm:gap-4">
            {analysis.metrics.map((m) => (
              <MetricRing
                key={m.category}
                score={m.score}
                color={categoryColor(m.category)}
                title={t.categories[m.category as keyof typeof t.categories] ?? m.category}
                subtitle={t.results.severity[m.severity as Severity]}
              />
            ))}
          </div>
        </div>

        {/* Détail dépliable par critère */}
        <div className="flex flex-col gap-3">
          {analysis.metrics.map((m) => {
            const isOpen = open === m.category;
            const zone = ZONE_LABEL[m.zone]?.[lang] ?? m.zone;
            return (
              <div key={m.category} className="card p-4">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : m.category)}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(m.category) }} />
                  <span className="flex-1 font-semibold">
                    {t.categories[m.category as keyof typeof t.categories] ?? m.category}
                  </span>
                  <span className="text-sm font-bold" style={{ minWidth: 32 }}>{m.score}</span>
                  <span className="text-ink-faint">{isOpen ? "▲" : "▼"}</span>
                </button>
                <div className="mt-3">
                  <ScoreBar score={m.score} color={categoryColor(m.category)} />
                </div>
                {isOpen && (
                  <div className="mt-3 animate-fade-in rounded-2xl bg-sand-50 p-3 text-sm text-ink-soft">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs">
                        <SeverityDot severity={m.severity as Severity} />
                        {t.results.severity[m.severity as Severity]}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs">📍 {zone}</span>
                    </div>
                    {m.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Carte recommandation IA (dégradé) */}
        {showRoutineCta && (
          <Link
            href="/routine"
            className="mt-6 flex items-center gap-3 rounded-[26px] bg-grad-brand p-5 text-white shadow-glow transition active:scale-[0.99]"
          >
            <span className="text-2xl">✨</span>
            <span className="flex-1">
              <span className="block font-semibold">{t.scan.seeRoutine}</span>
              <span className="block text-sm text-white/80">
                {lang === "fr"
                  ? "Une routine personnalisée générée à partir de votre analyse."
                  : "A personalized routine from your analysis."}
              </span>
            </span>
            <span className="text-xl">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
