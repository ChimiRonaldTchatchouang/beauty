import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { consoleApi, type CallRow } from './api.js';

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'En cours',
  ended: 'Terminé',
  resolved: 'Résolu',
  transferred: 'Transféré',
  error: 'Erreur',
};

/** Liste des appels. */
export function Calls() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    consoleApi.calls().then((d) => setCalls(d.calls)).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <p className="text-sm text-red-600">Erreur : {err}</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Numéro fictif</th>
            <th className="px-3 py-2">Accès</th>
            <th className="px-3 py-2">Durée</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {calls.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                Aucun appel enregistré.
              </td>
            </tr>
          ) : (
            calls.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-600">{new Date(c.started_at + 'Z').toLocaleString('fr-FR')}</td>
                <td className="px-3 py-2">{c.caller_number}</td>
                <td className="px-3 py-2">{c.access_mode === 'ussd_callback' ? 'Rappel USSD' : 'Direct'}</td>
                <td className="px-3 py-2">{c.duration_sec != null ? `${c.duration_sec}s` : '—'}</td>
                <td className="px-3 py-2">{STATUS_LABEL[c.status] ?? c.status}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/console/calls/${c.id}`} className="text-nextiaa-orange hover:underline">
                    Détail →
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
