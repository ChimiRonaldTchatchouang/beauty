"use client";

import { useState } from "react";
import { categoryColor, categoryShort, categoryZone } from "@/lib/categories";
import type { ScanMetricResult } from "@/lib/db/schema";

interface Marker {
  x: number;
  y: number;
  label: string;
  color: string;
  score: number;
}

/**
 * Photo de face avec repères pointant les critères à problème détectés.
 * `images` : photos supplémentaires (profils) affichées en vignettes.
 */
export function AnnotatedScan({
  image,
  images,
  metrics,
}: {
  image: string;
  images?: string[] | null;
  metrics: ScanMetricResult[];
}) {
  const gallery = (images && images.length > 0 ? images : [image]).filter(Boolean);
  const [active, setActive] = useState(0);
  const showAnnotations = active === 0; // repères pertinents sur la face

  const zoneCount: Record<string, number> = {};
  const markers: Marker[] = metrics
    .filter((m) => m.severity !== "none")
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((m) => {
      const base = categoryZone(m.category);
      const key = `${base.x},${base.y}`;
      const i = zoneCount[key] ?? 0;
      zoneCount[key] = i + 1;
      return {
        x: Math.max(8, Math.min(92, base.x + (i % 2 === 0 ? 0 : 12))),
        y: Math.max(8, Math.min(92, base.y + i * 6)),
        label: categoryShort(m.category),
        color: categoryColor(m.category),
        score: m.score,
      };
    });

  return (
    <div>
      <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-[26px] bg-sand-100 shadow-card">
        <div className="relative aspect-[3/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gallery[active]} alt="scan" className="h-full w-full object-cover" />

          {showAnnotations &&
            markers.map((m, i) => {
              const labelLeft = m.x > 58;
              return (
                <div
                  key={i}
                  className="animate-pin-pop absolute"
                  style={{ left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%,-50%)" }}
                >
                  <span className="absolute inset-0 -z-10 m-auto h-6 w-6 animate-pulse-ring rounded-full" style={{ backgroundColor: m.color, opacity: 0.35 }} />
                  <span className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: m.color }} />
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold shadow ${labelLeft ? "right-5" : "left-5"}`}
                    style={{ color: m.color }}
                  >
                    {m.label} · {m.score}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {gallery.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {gallery.map((g, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-14 w-12 overflow-hidden rounded-xl border-2 transition ${active === i ? "border-brand-400" : "border-transparent opacity-70"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g} alt={`angle ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-center text-[11px] text-ink-faint">
        {showAnnotations ? "Repères indicatifs des zones analysées" : "Autre angle"}
      </p>
    </div>
  );
}
