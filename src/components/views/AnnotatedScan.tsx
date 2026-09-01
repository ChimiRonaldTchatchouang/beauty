"use client";

import { useState } from "react";
import { categoryColor } from "@/components/Score";
import type { ScanMetricResult } from "@/lib/db/schema";

// Position indicative (en %) de chaque zone sur une photo de face.
const ZONE_POS: Record<string, { x: number; y: number }> = {
  front: { x: 50, y: 15 },
  contour_yeux: { x: 37, y: 39 },
  nez: { x: 50, y: 52 },
  joues: { x: 70, y: 57 },
  menton: { x: 50, y: 84 },
  global: { x: 50, y: 70 },
};

const SHORT_LABEL: Record<string, string> = {
  acne: "Acné",
  dark_spots: "Taches",
  wrinkles: "Rides",
  pores: "Pores",
  redness: "Rougeurs",
  hydration: "Hydratation",
  evenness: "Teint terne",
};

interface Marker {
  x: number;
  y: number;
  label: string;
  color: string;
  score: number;
}

/**
 * Photo de face avec repères pointant les zones à problème détectées.
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
  const showAnnotations = active === 0; // repères pertinents surtout sur la face

  // On ne pointe que les critères avec un souci visible (hors "global").
  const zoneCount: Record<string, number> = {};
  const markers: Marker[] = metrics
    .filter((m) => m.severity !== "none" && ZONE_POS[m.zone] && m.zone !== "global")
    .sort((a, b) => a.score - b.score)
    .map((m) => {
      const base = ZONE_POS[m.zone];
      const i = zoneCount[m.zone] ?? 0;
      zoneCount[m.zone] = i + 1;
      // Décale légèrement si plusieurs repères sur la même zone.
      return {
        x: base.x + (i % 2 === 0 ? 0 : 10) * (m.zone === "joues" ? -1 : 1),
        y: base.y + i * 7,
        label: SHORT_LABEL[m.category] ?? m.category,
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
                  {/* halo + point */}
                  <span
                    className="absolute inset-0 -z-10 m-auto h-6 w-6 animate-pulse-ring rounded-full"
                    style={{ backgroundColor: m.color, opacity: 0.35 }}
                  />
                  <span
                    className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: m.color }}
                  />
                  {/* étiquette */}
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold shadow ${
                      labelLeft ? "right-5" : "left-5"
                    }`}
                    style={{ color: m.color }}
                  >
                    {m.label} · {m.score}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Vignettes des angles (face / profils) */}
      {gallery.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {gallery.map((g, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-14 w-12 overflow-hidden rounded-xl border-2 transition ${
                active === i ? "border-brand-400" : "border-transparent opacity-70"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g} alt={`angle ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-center text-[11px] text-ink-faint">
        {showAnnotations
          ? "Repères indicatifs des zones analysées"
          : "Photo de profil"}
      </p>
    </div>
  );
}
