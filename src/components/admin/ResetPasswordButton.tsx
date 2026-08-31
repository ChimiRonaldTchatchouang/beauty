"use client";

import { useState, useTransition } from "react";
import { resetPassword } from "@/lib/actions/admin";

// Bouton admin : réinitialise le mot de passe d'un compte et affiche la valeur.
export function ResetPasswordButton({ userId, label }: { userId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      const res = await resetPassword(userId, custom || undefined);
      if (res.ok) setResult(res.password ?? "");
      else setError(res.error ?? "Erreur");
    });
  }

  function close() {
    setOpen(false);
    setCustom("");
    setResult(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-sand-200 px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-sand-50"
      >
        🔑 Mot de passe
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={close}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Modifier le mot de passe</h2>
            <p className="mt-1 text-sm text-ink-soft">{label}</p>

            {result ? (
              <div className="mt-4">
                <p className="text-sm text-ink-soft">Nouveau mot de passe :</p>
                <div className="mt-2 rounded-2xl bg-sand-50 p-4 text-center">
                  <strong className="select-all text-lg tracking-wide">{result}</strong>
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  Transmettez-le au compte concerné. Il ne sera plus affiché après fermeture.
                </p>
                <button onClick={close} className="btn-primary mt-4 w-full">Terminé</button>
              </div>
            ) : (
              <div className="mt-4">
                <input
                  className="field"
                  placeholder="Mot de passe (ou laisser vide pour générer)"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
                {error && <p className="mt-2 text-sm text-brand-600">{error}</p>}
                <div className="mt-4 flex gap-2">
                  <button onClick={close} className="btn-ghost flex-1">Annuler</button>
                  <button onClick={run} disabled={pending} className="btn-primary flex-1">
                    {pending ? "…" : custom ? "Définir" : "Générer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
