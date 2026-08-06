"use client";

import { useTransition } from "react";
import { renewLicense, setLicenseStatus, setCenterActive } from "@/lib/actions/admin";

interface LicenseLite {
  id: string;
  plan: string;
  status: string;
  expiresAt: string | null;
}

export function LicenseControls({
  centerId,
  centerActive,
  license,
  reason,
}: {
  centerId: string;
  centerActive: boolean;
  license: LicenseLite | null;
  reason: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-semibold capitalize">{license?.plan ?? "Aucune licence"}</p>
          <p className="text-sm text-ink-faint">
            {license?.expiresAt
              ? `Expire le ${new Date(license.expiresAt).toLocaleDateString("fr-FR")}`
              : "—"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            reason === "ok" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {reason === "ok"
            ? "Active"
            : reason === "expired"
              ? "Expirée"
              : reason === "suspended"
                ? "Suspendue"
                : "Aucune"}
        </span>
      </div>

      <form
        action={(fd) => start(async () => void (await renewLicense(fd)))}
        className="flex flex-col gap-3 border-t border-sand-100 pt-4"
      >
        <input type="hidden" name="centerId" value={centerId} />
        <p className="text-sm font-medium">Renouveler / changer de plan</p>
        <div className="grid grid-cols-2 gap-3">
          <select name="plan" className="field" defaultValue={license?.plan ?? "starter"}>
            <option value="trial">Essai</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="unlimited">Illimité</option>
          </select>
          <select name="durationMonths" className="field" defaultValue="1">
            <option value="1">1 mois</option>
            <option value="3">3 mois</option>
            <option value="6">6 mois</option>
            <option value="12">12 mois</option>
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "…" : "Émettre la licence"}
        </button>
      </form>

      <div className="mt-4 flex gap-2 border-t border-sand-100 pt-4">
        {license && license.status === "active" ? (
          <button
            onClick={() => start(async () => void (await setLicenseStatus(license.id, "suspended")))}
            className="btn-ghost flex-1 text-amber-700"
            disabled={pending}
          >
            Suspendre
          </button>
        ) : license ? (
          <button
            onClick={() => start(async () => void (await setLicenseStatus(license.id, "active")))}
            className="btn-ghost flex-1 text-green-700"
            disabled={pending}
          >
            Réactiver
          </button>
        ) : null}
        <button
          onClick={() => start(async () => void (await setCenterActive(centerId, !centerActive)))}
          className="btn-ghost flex-1"
          disabled={pending}
        >
          {centerActive ? "Désactiver le centre" : "Activer le centre"}
        </button>
      </div>
    </div>
  );
}
