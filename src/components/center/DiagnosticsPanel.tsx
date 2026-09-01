"use client";

import { useEffect, useState, useCallback } from "react";

interface Diag {
  env: { geminiKey: boolean; geminiModel: string; resend: boolean; appUrl: string | null };
  gemini: { ok: boolean; model?: string; error?: string };
  license: { active: boolean; reason: string; used: number; quota: number | null; remaining: number | null };
}

export function DiagnosticsPanel() {
  const [data, setData] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/center/diagnostics", { cache: "no-store" });
      if (!res.ok) throw new Error("Requête refusée");
      setData(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">État des services</p>
        <button onClick={run} disabled={loading} className="rounded-full border border-sand-200 px-3 py-1 text-xs font-semibold">
          {loading ? "…" : "↻ Re-tester"}
        </button>
      </div>

      {err && <p className="rounded-xl bg-brand-50 p-2 text-sm text-brand-700">{err}</p>}

      {data && (
        <div className="flex flex-col gap-2 text-sm">
          <Line
            ok={data.gemini.ok}
            label="Analyse IA (Gemini)"
            detail={data.gemini.ok ? `modèle : ${data.gemini.model}` : data.gemini.error}
          />
          <Line
            ok={data.license.active}
            label="Licence"
            detail={
              data.license.active
                ? data.license.quota === null
                  ? "active · scans illimités"
                  : `active · ${data.license.remaining} scan(s) restant(s)`
                : `inactive (${data.license.reason})`
            }
          />
          <Line ok={data.env.resend} label="Emails (Resend)" detail={data.env.resend ? "configuré" : "non configuré (RESEND_FROM ?)"} />
          <Line ok={Boolean(data.env.appUrl)} label="URL de l'app" detail={data.env.appUrl ?? "NEXT_PUBLIC_APP_URL manquant"} />
        </div>
      )}

      {data && !data.gemini.ok && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          👉 L'analyse échouera tant que ce test IA n'est pas au vert. Message ci-dessus =
          la cause exacte (clé, modèle, quota…).
        </p>
      )}
    </div>
  );
}

function Line({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2 border-b border-sand-100 pb-2 last:border-0">
      <span className={`mt-0.5 text-base ${ok ? "text-green-600" : "text-brand-600"}`}>{ok ? "✅" : "❌"}</span>
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {detail && <p className="break-words text-xs text-ink-faint">{detail}</p>}
      </div>
    </div>
  );
}
