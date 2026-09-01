"use client";

import { useState } from "react";

export interface IntakeAnswers {
  shaves?: boolean;
  shaveFreq?: string;
  perceivedSkin?: string;
  concerns: string[];
  sunExposure?: boolean;
  usesSpf?: string;
  dryLips?: boolean;
  tiredEyes?: boolean;
  allergies?: string;
  goal?: string;
}

const CONCERNS: [string, string][] = [
  ["dark_spots", "Taches"],
  ["acne", "Acné"],
  ["wrinkles", "Rides"],
  ["pores", "Pores"],
  ["redness", "Rougeurs"],
  ["evenness", "Teint terne"],
  ["dark_circles", "Cernes"],
];
const SKIN: [string, string][] = [
  ["oily", "Grasse"],
  ["dry", "Sèche"],
  ["combination", "Mixte"],
  ["sensitive", "Sensible"],
  ["normal", "Normale"],
  ["unknown", "Je ne sais pas"],
];
const GOALS = ["Éclat", "Taches", "Anti-âge", "Acné", "Hydratation", "Uniformité"];

export function IntakeForm({
  patientLabel,
  onDone,
  onBack,
}: {
  patientLabel: string;
  onDone: (a: IntakeAnswers) => void;
  onBack: () => void;
}) {
  const [a, setA] = useState<IntakeAnswers>({ concerns: [] });
  const set = (patch: Partial<IntakeAnswers>) => setA((p) => ({ ...p, ...patch }));
  const toggleConcern = (c: string) =>
    setA((p) => ({
      ...p,
      concerns: p.concerns.includes(c) ? p.concerns.filter((x) => x !== c) : [...p.concerns, c],
    }));

  return (
    <div className="mx-auto max-w-md">
      <button onClick={onBack} className="mb-2 text-sm text-ink-faint">← Patient</button>
      <h1 className="text-2xl font-bold">Questionnaire</h1>
      <p className="mb-5 text-sm text-ink-soft">
        Quelques questions sur {patientLabel} pour affiner l'analyse.
      </p>

      <div className="flex flex-col gap-5">
        <YesNo label="La personne se rase-t-elle le visage ?" value={a.shaves} onChange={(v) => set({ shaves: v })} />
        {a.shaves && (
          <Choice label="Fréquence de rasage" options={[["quotidien","Quotidien"],["hebdo","Qq fois / semaine"],["occasionnel","Occasionnel"]] as [string,string][]} value={a.shaveFreq} onChange={(v) => set({ shaveFreq: v })} />
        )}
        <Choice label="Type de peau ressenti" options={SKIN} value={a.perceivedSkin} onChange={(v) => set({ perceivedSkin: v })} />

        <div>
          <p className="mb-2 text-sm font-semibold">Préoccupations principales</p>
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map(([v, l]) => (
              <button key={v} onClick={() => toggleConcern(v)} className={`chip !py-2 ${a.concerns.includes(v) ? "chip-active" : ""}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <YesNo label="Exposition au soleil fréquente ?" value={a.sunExposure} onChange={(v) => set({ sunExposure: v })} />
        <Choice label="Utilise une protection solaire ?" options={[["oui","Oui"],["parfois","Parfois"],["non","Non"]] as [string,string][]} value={a.usesSpf} onChange={(v) => set({ usesSpf: v })} />
        <YesNo label="Lèvres souvent sèches ?" value={a.dryLips} onChange={(v) => set({ dryLips: v })} />
        <YesNo label="Cernes / fatigue fréquents ?" value={a.tiredEyes} onChange={(v) => set({ tiredEyes: v })} />
        <Choice label="Objectif principal" options={GOALS.map((g) => [g, g] as [string, string])} value={a.goal} onChange={(v) => set({ goal: v })} />

        <label className="text-sm font-semibold">
          Allergies / produits à éviter (optionnel)
          <input className="field mt-1" value={a.allergies ?? ""} onChange={(e) => set({ allergies: e.target.value })} placeholder="Parfum, alcool…" />
        </label>
      </div>

      <button onClick={() => onDone(a)} className="btn-primary mt-6 w-full">
        Continuer vers le scan →
      </button>
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="flex gap-2">
        {[["Oui", true], ["Non", false]].map(([l, v]) => (
          <button
            key={String(v)}
            onClick={() => onChange(v as boolean)}
            className={`chip flex-1 !py-2 ${value === v ? "chip-active" : ""}`}
          >
            {l as string}
          </button>
        ))}
      </div>
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} className={`chip !py-2 ${value === v ? "chip-active" : ""}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
