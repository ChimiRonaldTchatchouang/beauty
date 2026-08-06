"use client";

// Bandeau d'état de licence pour le centre (bloquant si inactive).
export function LicenseBanner({
  state,
}: {
  state: {
    active: boolean;
    reason: string;
    used: number;
    quota: number | null;
    remaining: number | null;
    expiresAt: string | null;
  };
}) {
  if (state.active) {
    const low = state.remaining !== null && state.remaining <= 3;
    if (!low) return null;
    return (
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        ⚠️ Il vous reste {state.remaining} scan(s) ce mois. Contactez votre administrateur pour augmenter votre quota.
      </div>
    );
  }

  const msg =
    state.reason === "expired"
      ? "Votre licence a expiré."
      : state.reason === "suspended"
        ? "Votre licence est suspendue."
        : "Aucune licence active.";

  return (
    <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
      🔒 {msg} Les scans sont désactivés. Contactez l'administrateur SkinScan pour réactiver votre accès.
    </div>
  );
}
