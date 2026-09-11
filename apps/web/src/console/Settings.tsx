import { useEffect, useState } from 'react';
import { consoleApi, type Settings as S } from './api.js';

/** Réglages : voix, instructions système, VAD, durée max. Appliqués au prochain appel. */
export function Settings() {
  const [s, setS] = useState<S | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    consoleApi.settings().then(setS).catch((e: Error) => setErr(e.message));
  }, []);

  const save = async () => {
    if (!s) return;
    try {
      const next = await consoleApi.updateSettings(s);
      setS(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (err) return <p className="text-sm text-red-600">Erreur : {err}</p>;
  if (!s) return <p className="text-sm text-gray-500">Chargement…</p>;

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
      <p className="text-xs text-gray-500">Les changements s'appliquent au prochain appel.</p>

      <label className="block">
        <span className="text-gray-700">Voix</span>
        <input value={s.voice} onChange={(e) => setS({ ...s, voice: e.target.value })} className="mt-1 w-full rounded border px-2 py-1" />
      </label>

      <label className="block">
        <span className="text-gray-700">Sensibilité VAD — silence (ms) : {s.vadSilenceMs}</span>
        <input
          type="range"
          min={300}
          max={1200}
          step={50}
          value={s.vadSilenceMs}
          onChange={(e) => setS({ ...s, vadSilenceMs: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>

      <label className="block">
        <span className="text-gray-700">Durée maximale d'appel (minutes)</span>
        <input
          type="number"
          min={1}
          max={60}
          value={s.maxCallMinutes}
          onChange={(e) => setS({ ...s, maxCallMinutes: Number(e.target.value) })}
          className="mt-1 w-32 rounded border px-2 py-1"
        />
      </label>

      <label className="block">
        <span className="text-gray-700">Instructions système (laisser vide = fichier par défaut)</span>
        <textarea
          value={s.systemPromptOverride ?? ''}
          onChange={(e) => setS({ ...s, systemPromptOverride: e.target.value || null })}
          rows={10}
          placeholder="(par défaut : apps/server/prompts/system.fr.md)"
          className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
        />
      </label>

      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded-full bg-nextiaa-orange px-5 py-2 font-semibold text-white">
          Enregistrer
        </button>
        {saved && <span className="text-sm text-green-600">Enregistré ✓</span>}
      </div>
    </div>
  );
}
