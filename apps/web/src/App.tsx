import { useEffect, useState } from 'react';

/** Wordmark texte « Nextiaa » : le N initial et le point final en orange. */
function Wordmark() {
  return (
    <span className="text-3xl font-bold tracking-tight text-nextiaa-black">
      <span className="text-nextiaa-orange">N</span>extiaa
      <span className="text-nextiaa-orange">.</span>
    </span>
  );
}

interface Health {
  ok: boolean;
  hasGeminiKey: boolean;
  model: string;
}

/**
 * J0 : page d'accueil minimale qui vérifie que le serveur répond.
 * Le téléphone simulé complet est construit aux jalons J1/J2.
 */
export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'inconnu'));
  }, []);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <Wordmark />
      <p className="text-sm text-gray-600">Assistant vocal IA — téléphone simulé (démo)</p>

      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-800">État du serveur</h2>
        {error && <p className="text-sm text-red-600">Serveur injoignable : {error}</p>}
        {!error && !health && <p className="text-sm text-gray-500">Vérification…</p>}
        {health && (
          <ul className="space-y-1 text-sm text-gray-700">
            <li>Serveur : {health.ok ? '✅ en ligne' : '❌'}</li>
            <li>Modèle : {health.model}</li>
            <li>Clé Gemini : {health.hasGeminiKey ? '✅ présente' : '⚠️ absente (.env)'}</li>
          </ul>
        )}
      </div>

      <p className="max-w-sm text-center text-xs text-gray-400">
        ⚠️ Données de démonstration fictives uniquement. Ne saisissez aucune donnée réelle.
      </p>
    </div>
  );
}
