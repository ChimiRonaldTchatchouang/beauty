"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ScanAnalysis } from "@/lib/db/schema";

interface ScanRow {
  overallScore: number | null;
  analysis: ScanAnalysis | null;
  createdAt: string | Date;
}

// Courbe simple d'évolution du score global (et hydratation en second plan).
export function ProgressChart({
  scans,
  locale,
}: {
  scans: ScanRow[];
  locale: string;
}) {
  const data = scans.map((s) => {
    const hydration = s.analysis?.metrics.find((m) => m.category === "hydration")?.score;
    return {
      date: new Date(s.createdAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      }),
      score: s.overallScore ?? 0,
      hydration: hydration ?? null,
    };
  });

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#a49a92" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#a49a92" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e7dcd2",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Score global"
            stroke="#d95b3c"
            strokeWidth={3}
            dot={{ r: 3, fill: "#d95b3c" }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="hydration"
            name="Hydratation"
            stroke="#3fa66a"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
