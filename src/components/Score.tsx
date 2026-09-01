"use client";

import type { Severity } from "@/lib/db/schema";
import { scoreColor, severityColor, categoryColor } from "@/lib/colors";

// Ré-export pour compatibilité (les composants client importaient depuis ici).
export { scoreColor, severityColor, categoryColor };

/** Anneau de score circulaire (SVG, sans dépendance). */
export function ScoreRing({
  score,
  size = 132,
  stroke = 12,
  label,
  color,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const col = color ?? scoreColor(score);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efeaf9" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color: col }}>
          {Math.round(score)}
        </span>
        {label && <span className="text-xs text-ink-faint">{label}</span>}
      </div>
    </div>
  );
}

/** Mini-anneau coloré par critère, avec % au centre + libellé dessous. */
export function MetricRing({
  score,
  color,
  title,
  subtitle,
  size = 74,
  stroke = 8,
}: {
  score: number;
  color: string;
  title: string;
  subtitle?: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efeaf9" strokeWidth={stroke} />
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
        <span className="absolute text-sm font-bold" style={{ color }}>
          {Math.round(score)}%
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold leading-tight text-ink">{title}</p>
        {subtitle && <p className="text-[10px] text-ink-faint">{subtitle}</p>}
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
export function ScoreBar({ score, color }: { score: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sand-100">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(4, score)}%`, backgroundColor: color ?? scoreColor(score) }}
      />
    </div>
  );
}
