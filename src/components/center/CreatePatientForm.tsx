"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/actions/center";

export function CreatePatientForm({ redirectToScan = false }: { redirectToScan?: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createPatient(formData);
      if (res.ok) {
        setOpen(false);
        if (redirectToScan && res.id) router.push(`/center/scan?patient=${res.id}`);
        else if (res.id) router.push(`/center/patients/${res.id}`);
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nouveau patient
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold">Nouveau patient</h2>
        <p className="mb-4 text-sm text-ink-soft">
          L'email Google du patient lui permettra de retrouver ses résultats.
        </p>
        <form action={submit} className="flex flex-col gap-3">
          <input name="name" className="field" placeholder="Nom du patient" />
          <input name="email" type="email" className="field" placeholder="Email Google du patient" required />
          <input name="phone" type="tel" className="field" placeholder="Téléphone WhatsApp (ex. +237…)" />
          {error && <p className="text-sm text-brand-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
              Annuler
            </button>
            <button className="btn-primary flex-1" disabled={pending}>
              {pending ? "…" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
