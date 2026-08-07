"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCenter, type CreateCenterResult } from "@/lib/actions/admin";

export function CreateCenterForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateCenterResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createCenter(formData);
      if (res.ok) setCreated(res);
      else setError(res.error ?? "Erreur");
    });
  }

  function close() {
    setOpen(false);
    setCreated(null);
    setError(null);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nouveau centre
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={close}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        {created ? (
          <div>
            <div className="mb-2 text-3xl">✅</div>
            <h2 className="text-lg font-bold">Centre créé</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {created.emailSent
                ? "Les accès ont été envoyés par email au gérant."
                : "⚠️ L'email n'a pas pu être envoyé. Communiquez ces accès au gérant :"}
            </p>

            <div className="mt-4 rounded-2xl bg-sand-50 p-4 text-sm">
              <p className="mb-1">
                Email : <strong>{created.email}</strong>
              </p>
              <p>
                Mot de passe :{" "}
                <strong className="select-all tracking-wide">{created.tempPassword}</strong>
              </p>
            </div>

            {!created.emailSent && created.emailError && (
              <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
                Détail : {created.emailError}
              </p>
            )}

            <p className="mt-3 text-xs text-ink-faint">
              Le gérant se connecte via « Connexion administrateur / centre » avec ces identifiants.
            </p>

            <button onClick={close} className="btn-primary mt-5 w-full">
              Terminé
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-bold">Nouveau centre</h2>
            <form action={submit} className="flex flex-col gap-3">
              <input name="name" className="field" placeholder="Nom du centre" required />
              <input name="city" className="field" placeholder="Ville" />
              <input name="adminEmail" type="email" className="field" placeholder="Email du gérant" required />
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
                <button type="button" onClick={close} className="btn-ghost flex-1">
                  Annuler
                </button>
                <button className="btn-primary flex-1" disabled={pending}>
                  {pending ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
