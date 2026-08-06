"use client";

import type { Severity } from "@/lib/db/schema";

// Couleur en fonction du score (rouge → ambre → vert).
export function scoreColor(score: number): string {
  if (score >= 80) return "#3fa66a";
  if (score >= 60) return "#8bbf4d";
  if (score >= 40) return "#e0a92e";
  return "#d95b3c";
}

export function severityColor(sev: Severity): string {
  return {
    none: "#3fa66a",
    low: "#8bbf4d",
    medium: "#e0a92e",
    high: "#d95b3c",
  }[sev];
}

/** Anneau de score circulaire (SVG, sans dépendance). */
export function ScoreRing({
  score,
  size = 132,
  stroke = 12,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = scoreColor(score);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3ede7" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {Math.round(score)}
        </span>
        {label && <span className="text-xs text-ink-faint">{label}</span>}
      </div>
    </div>
  );
}

/** Pastille de sévérité colorée. */
export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full"
      style={{ backgroundColor: severityColor(severity) }}
      aria-hidden
    />
  );
}

/** Petite barre horizontale de score. */
export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sand-100">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(4, score)}%`, backgroundColor: scoreColor(score) }}
      />
    </div>
  );
}
