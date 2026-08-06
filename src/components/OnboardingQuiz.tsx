"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { I18nProvider, useI18n } from "@/lib/i18n/context";

interface Answers {
  skinType?: string;
  ageRange?: string;
  concerns: string[];
  allergies: string;
  currentRoutine?: string;
}

const SKIN_TYPES = [
  { value: "oily", fr: "Grasse", en: "Oily", emoji: "💧" },
  { value: "dry", fr: "Sèche", en: "Dry", emoji: "🏜️" },
  { value: "combination", fr: "Mixte", en: "Combination", emoji: "🌗" },
  { value: "sensitive", fr: "Sensible", en: "Sensitive", emoji: "🌸" },
  { value: "unknown", fr: "Je ne sais pas", en: "Not sure", emoji: "🤷" },
];

const AGE_RANGES = ["<18", "18-24", "25-34", "35-44", "45-54", "55+"];

const CONCERNS = [
  { value: "acne", fr: "Acné", en: "Acne" },
  { value: "dark_spots", fr: "Taches", en: "Dark spots" },
  { value: "wrinkles", fr: "Rides", en: "Wrinkles" },
  { value: "pores", fr: "Pores", en: "Pores" },
  { value: "redness", fr: "Rougeurs", en: "Redness" },
  { value: "dullness", fr: "Teint terne", en: "Dullness" },
];

const ROUTINES = [
  { value: "none", fr: "Aucune", en: "None" },
  { value: "basic", fr: "Basique", en: "Basic" },
  { value: "complete", fr: "Complète", en: "Complete" },
];

function Quiz() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ concerns: [], allergies: "" });
  const [saving, setSaving] = useState(false);

  const totalSteps = 5; // 5 questions, puis résumé (step 5)

  function next() {
    setStep((s) => s + 1);
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function toggleConcern(v: string) {
    setAnswers((a) => ({
      ...a,
      concerns: a.concerns.includes(v)
        ? a.concerns.filter((c) => c !== v)
        : [...a.concerns, v],
    }));
  }

  async function finish() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      router.push("/scan");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const progress = Math.min(100, (step / totalSteps) * 100);

  return (
    <div className="flex min-h-dvh flex-col bg-sand-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Barre de progression */}
        <div className="mb-8 flex items-center gap-3">
          {step > 0 && step < totalSteps && (
            <button onClick={prev} className="text-ink-faint" aria-label={t.common.back}>
              ←
            </button>
          )}
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand-200">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div key={step} className="flex flex-1 animate-fade-in flex-col">
          {/* Q1 — type de peau */}
          {step === 0 && (
            <>
              <h2 className="mb-6 text-2xl font-bold">{t.onboarding.skinType}</h2>
              <div className="flex flex-col gap-3">
                {SKIN_TYPES.map((s) => (
                  <button
                    key={s.value}
                    className={`chip flex items-center gap-3 text-left ${answers.skinType === s.value ? "chip-active" : ""}`}
                    onClick={() => {
                      setAnswers((a) => ({ ...a, skinType: s.value }));
                      setTimeout(next, 150);
                    }}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {lang === "fr" ? s.fr : s.en}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Q2 — âge */}
          {step === 1 && (
            <>
              <h2 className="mb-6 text-2xl font-bold">{t.onboarding.age}</h2>
              <div className="grid grid-cols-2 gap-3">
                {AGE_RANGES.map((a) => (
                  <button
                    key={a}
                    className={`chip ${answers.ageRange === a ? "chip-active" : ""}`}
                    onClick={() => {
                      setAnswers((prev) => ({ ...prev, ageRange: a }));
                      setTimeout(next, 150);
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Q3 — préoccupations (multi) */}
          {step === 2 && (
            <>
              <h2 className="mb-1 text-2xl font-bold">{t.onboarding.concerns}</h2>
              <p className="mb-6 text-sm text-ink-faint">{t.onboarding.concernsHint}</p>
              <div className="grid grid-cols-2 gap-3">
                {CONCERNS.map((c) => (
                  <button
                    key={c.value}
                    className={`chip ${answers.concerns.includes(c.value) ? "chip-active" : ""}`}
                    onClick={() => toggleConcern(c.value)}
                  >
                    {lang === "fr" ? c.fr : c.en}
                  </button>
                ))}
              </div>
              <button className="btn-primary mt-8 w-full" onClick={next}>
                {t.common.continue}
              </button>
            </>
          )}

          {/* Q4 — allergies */}
          {step === 3 && (
            <>
              <h2 className="mb-1 text-2xl font-bold">{t.onboarding.allergies}</h2>
              <p className="mb-6 text-sm text-ink-faint">{t.onboarding.allergiesHint}</p>
              <textarea
                className="field min-h-28 resize-none"
                placeholder="Parfum, alcool, huiles essentielles…"
                value={answers.allergies}
                onChange={(e) => setAnswers((a) => ({ ...a, allergies: e.target.value }))}
              />
              <button className="btn-primary mt-8 w-full" onClick={next}>
                {t.common.continue}
              </button>
            </>
          )}

          {/* Q5 — routine actuelle */}
          {step === 4 && (
            <>
              <h2 className="mb-6 text-2xl font-bold">{t.onboarding.routine}</h2>
              <div className="flex flex-col gap-3">
                {ROUTINES.map((r) => (
                  <button
                    key={r.value}
                    className={`chip ${answers.currentRoutine === r.value ? "chip-active" : ""}`}
                    onClick={() => {
                      setAnswers((a) => ({ ...a, currentRoutine: r.value }));
                      setTimeout(next, 150);
                    }}
                  >
                    {lang === "fr" ? r.fr : r.en}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Résumé */}
          {step === 5 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-6 text-5xl">✨</div>
              <h2 className="text-2xl font-bold">{t.onboarding.summaryTitle}</h2>
              <div className="card mt-6 w-full text-left text-sm">
                <SummaryRow label={t.onboarding.skinType} value={skinTypeLabel(answers.skinType, lang)} />
                <SummaryRow label={t.onboarding.age} value={answers.ageRange} />
                <SummaryRow
                  label={t.onboarding.concerns}
                  value={answers.concerns
                    .map((c) => concernLabel(c, lang))
                    .join(", ")}
                />
                <SummaryRow label={t.onboarding.routine} value={routineLabel(answers.currentRoutine, lang)} />
              </div>
              <button className="btn-primary mt-8 w-full" onClick={finish} disabled={saving}>
                {saving ? t.common.loading : t.onboarding.firstScan}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-sand-100 py-2 last:border-0">
      <span className="text-ink-faint">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function skinTypeLabel(v: string | undefined, lang: string) {
  const item = SKIN_TYPES.find((s) => s.value === v);
  return item ? (lang === "fr" ? item.fr : item.en) : undefined;
}
function concernLabel(v: string, lang: string) {
  const item = CONCERNS.find((c) => c.value === v);
  return item ? (lang === "fr" ? item.fr : item.en) : v;
}
function routineLabel(v: string | undefined, lang: string) {
  const item = ROUTINES.find((r) => r.value === v);
  return item ? (lang === "fr" ? item.fr : item.en) : undefined;
}

export function OnboardingQuiz() {
  return (
    <I18nProvider>
      <Quiz />
    </I18nProvider>
  );
}
