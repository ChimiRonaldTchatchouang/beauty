import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { consoleApi, type CallDetail as Detail } from './api.js';

/** Détail d'un appel : transcription horodatée, outils, SMS, latence. */
export function CallDetail() {
  const { id = '' } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    consoleApi.call(id).then(setD).catch((e: Error) => setErr(e.message));
  }, [id]);

  if (err) return <p className="text-sm text-red-600">Erreur : {err}</p>;
  if (!d) return <p className="text-sm text-gray-500">Chargement…</p>;
  if (!d.call) return <p className="text-sm text-gray-500">Appel introuvable.</p>;

  const c = d.call;
  return (
    <div className="space-y-5">
      <Link to="/console/calls" className="text-sm text-nextiaa-orange">
        ← Appels
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Info label="Numéro fictif" value={c.caller_number} />
          <Info label="SIM" value={c.sim_operator} />
          <Info label="Accès" value={c.access_mode === 'ussd_callback' ? 'Rappel USSD' : 'Direct'} />
          <Info label="Qualité tél." value={c.phone_quality ? 'Oui' : 'Non'} />
          <Info label="Durée" value={c.duration_sec != null ? `${c.duration_sec}s` : '—'} />
          <Info label="Statut" value={c.status} />
          <Info label="Motif" value={c.reason ?? '—'} />
        </div>
      </div>

      <Section title="Transcription">
        {d.turns.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1">
            {d.turns.map((t, i) => (
              <li key={i} className="text-sm">
                <span className="text-[10px] text-gray-400">{new Date(t.at + 'Z').toLocaleTimeString('fr-FR')} </span>
                <span className={t.who === 'agent' ? 'font-semibold text-nextiaa-orange' : 'font-semibold text-gray-700'}>
                  {t.who === 'agent' ? 'Assistant' : 'Appelant'} :{' '}
                </span>
                <span className="text-gray-800">{t.text}</span>
                {t.latency_ms != null && <span className="ml-1 text-[10px] text-green-600">({t.latency_ms} ms)</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Outils appelés">
        {d.tools.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1 text-sm">
            {d.tools.map((t, i) => (
              <li key={i}>
                <span className={t.ok ? 'text-gray-800' : 'text-red-600'}>{t.name}</span>
                <span className="ml-2 text-xs text-gray-400">{t.args_json}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="SMS envoyés">
        {d.sms.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-1 text-sm text-gray-700">
            {d.sms.map((s, i) => (
              <li key={i}>→ {s.to_number} : {s.body}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}
function Empty() {
  return <p className="text-sm text-gray-400">Aucun élément.</p>;
}
