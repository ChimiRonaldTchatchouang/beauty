"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { ScoreRing, ScoreBar, SeverityDot } from "@/components/Score";
import type { ScanAnalysis, Severity } from "@/lib/db/schema";

const ZONE_LABEL: Record<string, { fr: string; en: string }> = {
  front: { fr: "Front", en: "Forehead" },
  joues: { fr: "Joues", en: "Cheeks" },
  nez: { fr: "Nez", en: "Nose" },
  menton: { fr: "Menton", en: "Chin" },
  contour_yeux: { fr: "Contour des yeux", en: "Eye area" },
  global: { fr: "Visage entier", en: "Whole face" },
};

export function ResultsView({
  analysis,
  image,
  showRoutineCta = true,
  date,
}: {
  analysis: ScanAnalysis;
  image?: string | null;
  showRoutineCta?: boolean;
  date?: string | Date;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="animate-fade-in lg:grid lg:grid-cols-[320px_1fr] lg:gap-8">
      {/* Colonne aperçu (score + photo) — reste visible sur desktop */}
      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="card flex flex-col items-center text-center">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt="scan"
              className="mb-4 h-28 w-28 rounded-2xl object-cover"
            />
          )}
          <p className="text-sm text-ink-faint">{t.results.overall}</p>
          <div className="mt-2">
            <ScoreRing score={analysis.overallScore} />
          </div>
          <p className="mt-3 text-sm text-ink-soft">{analysis.summary}</p>
          {date && (
            <p className="mt-2 text-xs text-ink-faint">
              {new Date(date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {showRoutineCta && (
          <Link href="/routine" className="btn-primary mt-4 hidden w-full lg:flex">
            {t.scan.seeRoutine}
          </Link>
        )}
      </div>

      {/* Détail par critère */}
      <div className="mt-6 lg:mt-0">
        <h2 className="mb-3 text-lg font-bold">{t.results.details}</h2>
        <div className="flex flex-col gap-3">
          {analysis.metrics.map((m) => {
            const isOpen = open === m.category;
            const zone = ZONE_LABEL[m.zone]?.[lang] ?? m.zone;
            return (
              <div key={m.category} className="card p-4">
                <button
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => setOpen(isOpen ? null : m.category)}
                >
                  <SeverityDot severity={m.severity as Severity} />
                  <span className="flex-1 font-semibold">
                    {t.categories[m.category as keyof typeof t.categories] ?? m.category}
                  </span>
                  <span className="text-sm font-bold" style={{ minWidth: 32 }}>
                    {m.score}
                  </span>
                  <span className="text-ink-faint">{isOpen ? "▲" : "▼"}</span>
                </button>
                <div className="mt-3">
                  <ScoreBar score={m.score} />
                </div>
                {isOpen && (
                  <div className="mt-3 animate-fade-in rounded-2xl bg-sand-50 p-3 text-sm text-ink-soft">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs">
                        {t.results.severity[m.severity as Severity]}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs">
                        📍 {zone}
                      </span>
                    </div>
                    {m.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showRoutineCta && (
          <Link href="/routine" className="btn-primary mt-6 flex w-full lg:hidden">
            {t.scan.seeRoutine}
          </Link>
        )}
      </div>
    </div>
  );
}
