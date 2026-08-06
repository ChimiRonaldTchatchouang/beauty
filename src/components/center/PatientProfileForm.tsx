"use client";

import { useState, useTransition } from "react";
import { updatePatientProfile } from "@/lib/actions/center";

export function PatientProfileForm({
  patientId,
  profile,
}: {
  patientId: string;
  profile: { skinType: string; ageRange: string; concerns: string; allergies: string; notes: string };
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function submit(fd: FormData) {
    setSaved(false);
    start(async () => {
      const res = await updatePatientProfile(fd);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <form action={submit} className="card flex flex-col gap-3">
      <input type="hidden" name="patientId" value={patientId} />
      <label className="text-sm font-medium">
        Type de peau
        <select name="skinType" defaultValue={profile.skinType} className="field mt-1">
          <option value="">—</option>
          <option value="oily">Grasse</option>
          <option value="dry">Sèche</option>
          <option value="combination">Mixte</option>
          <option value="sensitive">Sensible</option>
          <option value="unknown">Inconnu</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Tranche d'âge
        <select name="ageRange" defaultValue={profile.ageRange} className="field mt-1">
          <option value="">—</option>
          {["<18", "18-24", "25-34", "35-44", "45-54", "55+"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Préoccupations (séparées par des virgules)
        <input name="concerns" defaultValue={profile.concerns} className="field mt-1" placeholder="acne, dark_spots, wrinkles" />
      </label>
      <label className="text-sm font-medium">
        Allergies / à éviter
        <input name="allergies" defaultValue={profile.allergies} className="field mt-1" />
      </label>
      <label className="text-sm font-medium">
        Notes internes (non visibles par le patient)
        <textarea name="notes" defaultValue={profile.notes} className="field mt-1 min-h-20 resize-none" />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Enregistré</span>}
      </div>
    </form>
  );
}
