import { useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { consoleApi, getPassword, setPassword } from './api.js';
import { Dashboard } from './Dashboard.js';
import { Calls } from './Calls.js';
import { CallDetail } from './CallDetail.js';
import { Knowledge } from './Knowledge.js';
import { Tickets } from './Tickets.js';
import { Settings } from './Settings.js';

/** Console d'administration (usage local), protégée par mot de passe simple. */
export default function Console() {
  const [authed, setAuthed] = useState(getPassword().length > 0);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const tabs = [
    { to: '/console', label: 'Tableau de bord', end: true },
    { to: '/console/calls', label: 'Appels' },
    { to: '/console/kb', label: 'Connaissances' },
    { to: '/console/tickets', label: 'Tickets' },
    { to: '/console/settings', label: 'Réglages' },
  ];

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <span className="text-lg font-bold">
          <span className="text-nextiaa-orange">N</span>extiaa<span className="text-nextiaa-orange">.</span>{' '}
          <span className="text-gray-500">Console</span>
        </span>
        <Link to="/" className="text-xs text-gray-500 hover:text-nextiaa-orange">
          ← Téléphone
        </Link>
      </header>

      <nav className="mb-5 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `rounded-full px-3 py-1 text-sm ${isActive ? 'bg-nextiaa-orange text-white' : 'text-gray-600 hover:bg-gray-100'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="calls" element={<Calls />} />
        <Route path="calls/:id" element={<CallDetail />} />
        <Route path="kb" element={<Knowledge />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

function Login({ onOk }: { onOk: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassword(pw);
    try {
      await consoleApi.login();
      onOk();
    } catch {
      setErr('Mot de passe invalide.');
      setPassword('');
    }
  };

  return (
    <div className="mx-auto mt-20 max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-lg font-semibold">Console Nextiaa Voice</h1>
      <p className="mb-4 text-xs text-gray-500">Usage local. Mot de passe défini dans .env (CONSOLE_PASSWORD).</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Mot de passe"
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" className="w-full rounded-full bg-nextiaa-orange py-2 font-semibold text-white">
          Entrer
        </button>
      </form>
      <Link to="/" className="mt-3 inline-block text-xs text-gray-500">
        ← Retour au téléphone
      </Link>
    </div>
  );
}
