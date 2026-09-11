import { useEffect, useState } from 'react';
import { consoleApi, type TicketRow } from './api.js';

/** Liste et détail des tickets. */
export function Tickets() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    consoleApi.tickets().then((d) => setTickets(d.tickets)).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <p className="text-sm text-red-600">Erreur : {err}</p>;

  return (
    <div className="space-y-2">
      {tickets.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun ticket.</p>
      ) : (
        tickets.map((t) => (
          <div key={t.reference} className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-nextiaa-black">{t.reference}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  t.priority === 'haute' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.priority}
              </span>
            </div>
            <p className="mt-1 text-gray-700">{t.summary}</p>
            <p className="mt-1 text-[11px] text-gray-400">
              {t.category} · {t.status} · {new Date(t.at + 'Z').toLocaleString('fr-FR')}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
