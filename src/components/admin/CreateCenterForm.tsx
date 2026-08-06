"use client";

import { useState, useTransition } from "react";
import { createCenter } from "@/lib/actions/admin";

export function CreateCenterForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createCenter(formData);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erreur");
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nouveau centre
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">Nouveau centre</h2>
        <form action={submit} className="flex flex-col gap-3">
          <input name="name" className="field" placeholder="Nom du centre" required />
          <input name="city" className="field" placeholder="Ville" />
          <input
            name="adminEmail"
            type="email"
            className="field"
            placeholder="Email Google du gérant"
            required
          />
          <input name="contactPhone" className="field" placeholder="Téléphone (optionnel)" />
          <div className="grid grid-cols-2 gap-3">
            <select name="plan" className="field" defaultValue="trial">
              <option value="trial">Essai (10 scans)</option>
              <option value="starter">Starter (50)</option>
              <option value="pro">Pro (200)</option>
              <option value="unlimited">Illimité</option>
            </select>
            <select name="durationMonths" className="field" defaultValue="1">
              <option value="1">1 mois</option>
              <option value="3">3 mois</option>
              <option value="6">6 mois</option>
              <option value="12">12 mois</option>
            </select>
          </div>

          {error && <p className="text-sm text-brand-600">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
              Annuler
            </button>
            <button className="btn-primary flex-1" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
