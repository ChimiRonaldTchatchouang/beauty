"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Routine, RoutineStep } from "@/lib/db/schema";

const CATEGORY_EMOJI: Record<string, string> = {
  cleanser: "🧼",
  serum: "💧",
  moisturizer: "🧴",
  spf: "☀️",
  treatment: "✨",
};

export function RoutineView({ routine }: { routine: Routine | null }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"morning" | "evening" | "shaving">("morning");

  if (!routine) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 text-5xl">🧴</div>
        <h1 className="text-xl font-bold">{t.routine.title}</h1>
        <p className="mt-2 text-ink-soft">{t.routine.empty}</p>
        <Link href="/scan" className="btn-primary mt-6">
          {t.home.cta}
        </Link>
      </div>
    );
  }

  const hasShaving = Boolean(routine.shaving && routine.shaving.length > 0);
  const tabs: ("morning" | "evening" | "shaving")[] = hasShaving
    ? ["morning", "evening", "shaving"]
    : ["morning", "evening"];
  const activeTab = tab === "shaving" && !hasShaving ? "morning" : tab;
  const steps = activeTab === "shaving" ? routine.shaving ?? [] : routine[activeTab];
  const tabLabel: Record<string, string> = {
    morning: `🌅 ${t.routine.morning}`,
    evening: `🌙 ${t.routine.evening}`,
    shaving: "🪒 Rasage",
  };

  return (
    <div className="animate-fade-in">
      <h1 className="mb-4 text-2xl font-bold">{t.routine.title}</h1>

      {/* Onglets matin / soir / rasage */}
      <Tabs value={activeTab} onValueChange={(v) => setTab(v as "morning" | "evening" | "shaving")} className="mb-6 block">
        <TabsList>
          {tabs.map((k) => (
            <TabsTrigger key={k} value={k}>
              {tabLabel[k]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Étapes numérotées */}
        <ol className="flex flex-col gap-3">
          {steps.map((step) => (
            <StepCard key={`${tab}-${step.order}`} step={step} />
          ))}
        </ol>

        {/* Conseils complémentaires */}
        <div className="mt-8 lg:mt-0">
          <h2 className="mb-3 text-lg font-bold">💡 {t.routine.tips}</h2>
          <div className="flex flex-col gap-3">
            {routine.tips.map((tip, i) => (
              <div key={i} className="card p-4">
                <p className="font-semibold">{tip.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: RoutineStep }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className="card p-4">
      <button className="flex w-full items-center gap-4 text-left" onClick={() => setOpen(!open)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-lg">
          {CATEGORY_EMOJI[step.category] ?? "•"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-500">Étape {step.order}</p>
          <p className="font-semibold">{step.title}</p>
        </div>
        <span className="text-ink-faint">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 animate-fade-in space-y-2 rounded-2xl bg-sand-50 p-3 text-sm">
          <p>
            <span className="font-semibold">{t.routine.why} : </span>
            <span className="text-ink-soft">{step.reason}</span>
          </p>
          {step.keyIngredient && (
            <p>
              <span className="font-semibold">{t.routine.lookFor} : </span>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {step.keyIngredient}
              </span>
            </p>
          )}
          <p>
            <span className="font-semibold">{t.routine.frequency} : </span>
            <span className="text-ink-soft">{step.frequency}</span>
          </p>
        </div>
      )}
    </li>
  );
}
