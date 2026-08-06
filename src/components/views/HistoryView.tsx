"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { scoreColor, ScoreRing } from "@/components/Score";
import { ProgressChart } from "@/components/ProgressChart";
import type { ScanAnalysis } from "@/lib/db/schema";

interface ScanRow {
  id: string;
  overallScore: number | null;
  thumbnailData: string | null;
  analysis: ScanAnalysis | null;
  createdAt: string | Date;
}

export function HistoryView({ scans }: { scans: ScanRow[] }) {
  const { t, lang } = useI18n();
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const ordered = useMemo(() => [...scans].reverse(), [scans]); // récent → ancien pour la liste

  if (scans.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 text-5xl">📭</div>
        <h1 className="text-xl font-bold">{t.history.title}</h1>
        <p className="mt-2 text-ink-soft">{t.history.empty}</p>
        <Link href="/scan" className="btn-primary mt-6">
          {t.history.emptyCta}
        </Link>
      </div>
    );
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  }

  const compareA = scans.find((s) => s.id === selected[0]);
  const compareB = scans.find((s) => s.id === selected[1]);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.history.title}</h1>
        {scans.length >= 2 && (
          <button
            onClick={() => {
              setCompareMode((c) => !c);
              setSelected([]);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              compareMode ? "bg-brand-500 text-white" : "border border-sand-200 bg-white"
            }`}
          >
            {t.history.compare}
          </button>
        )}
      </div>

      {/* Graphique de progression */}
      {scans.length >= 2 && !compareMode && (
        <div className="card mb-6">
          <p className="mb-3 font-semibold">📈 {t.history.progress}</p>
          <ProgressChart scans={scans} locale={locale} />
        </div>
      )}

      {/* Comparaison avant/après */}
      {compareMode && (
        <div className="mb-6">
          {compareA && compareB ? (
            <div className="grid grid-cols-2 gap-3">
              {[compareA, compareB].map((s, i) => (
                <div key={s.id} className="card flex flex-col items-center text-center">
                  <p className="mb-2 text-xs text-ink-faint">
                    {i === 0 ? "Avant" : "Après"} ·{" "}
                    {new Date(s.createdAt).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  {s.thumbnailData && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.thumbnailData}
                      alt=""
                      className="mb-3 h-24 w-24 rounded-2xl object-cover"
                    />
                  )}
                  <ScoreRing score={s.overallScore ?? 0} size={84} stroke={8} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-sand-100 p-4 text-center text-sm text-ink-soft">
              {t.history.selectTwo}
            </p>
          )}
        </div>
      )}

      {/* Liste des scans */}
      <div className="flex flex-col gap-3">
        {ordered.map((s) => {
          const isSelected = selected.includes(s.id);
          const content = (
            <div
              className={`card flex items-center gap-4 transition ${
                compareMode && isSelected ? "ring-2 ring-brand-400" : ""
              }`}
            >
              {s.thumbnailData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.thumbnailData}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sand-100 text-xl">
                  🙂
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {new Date(s.createdAt).toLocaleDateString(locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <p className="text-sm text-ink-faint">
                  {new Date(s.createdAt).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div
                className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: scoreColor(s.overallScore ?? 0) }}
              >
                {s.overallScore ?? "—"}
              </div>
            </div>
          );

          return compareMode ? (
            <button key={s.id} onClick={() => toggleSelect(s.id)} className="text-left">
              {content}
            </button>
          ) : (
            <Link key={s.id} href={`/history/${s.id}`}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
