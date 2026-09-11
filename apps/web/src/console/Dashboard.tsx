import { useEffect, useState } from 'react';
import { consoleApi } from './api.js';

/** Tableau de bord : indicateurs clés + questions les plus fréquentes. */
export function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof consoleApi.dashboard>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    consoleApi.dashboard().then(setData).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <p className="text-sm text-red-600">Erreur : {err}</p>;
  if (!data) return <p className="text-sm text-gray-500">Chargement…</p>;

  const cards = [
    { label: "Nombre d'appels", value: data.total },
    { label: 'Durée moyenne', value: `${data.avgDurationSec}s` },
    { label: 'Appels transférés', value: `${data.transferredPct}%` },
    { label: 'Latence moyenne', value: `${data.avgLatencyMs} ms` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-nextiaa-black">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Questions les plus fréquentes</h2>
        {data.topQueries.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune recherche enregistrée pour l'instant.</p>
        ) : (
          <ul className="space-y-1">
            {data.topQueries.map((q) => (
              <li key={q.query} className="flex justify-between text-sm">
                <span className="text-gray-700">{q.query}</span>
                <span className="font-semibold text-nextiaa-orange">{q.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
