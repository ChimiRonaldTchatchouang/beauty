import { useEffect, useState } from 'react';
import { consoleApi, type KbFiche } from './api.js';

const CATEGORIES = ['operateurs', 'depannage', 'assurance', 'general'];
const EMPTY: KbFiche = {
  id: '',
  category: 'general',
  operator: null,
  title: '',
  content: '',
  source: '',
  last_verified: '',
  verified: false,
};

/** Base de connaissances : liste filtrable, ajout/modification, bascule vérifié. */
export function Knowledge() {
  const [fiches, setFiches] = useState<KbFiche[]>([]);
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState<KbFiche | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => consoleApi.kb().then((d) => setFiches(d.fiches)).catch((e: Error) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!edit) return;
    await consoleApi.kbUpsert(edit);
    setEdit(null);
    load();
  };

  const toggle = async (f: KbFiche) => {
    await consoleApi.kbSetVerified(f.id, !f.verified);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(`Supprimer la fiche ${id} ?`)) return;
    await consoleApi.kbDelete(id);
    load();
  };

  const shown = fiches.filter(
    (f) => f.title.toLowerCase().includes(filter.toLowerCase()) || f.id.toLowerCase().includes(filter.toLowerCase()),
  );

  if (err) return <p className="text-sm text-red-600">Erreur : {err}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer par titre ou id…"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => setEdit({ ...EMPTY })}
          className="rounded-full bg-nextiaa-orange px-4 py-2 text-sm font-semibold text-white"
        >
          + Nouvelle fiche
        </button>
      </div>

      {edit && <FicheForm fiche={edit} onChange={setEdit} onSave={save} onCancel={() => setEdit(null)} />}

      <div className="space-y-2">
        {shown.map((f) => (
          <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800">{f.title}</p>
                <p className="text-[11px] text-gray-400">
                  {f.id} · {f.category}
                  {f.operator ? ` · ${f.operator}` : ''} · vérif. {f.last_verified || '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggle(f)}
                  className={`rounded-full px-2 py-1 text-xs ${f.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {f.verified ? 'Vérifiée' : 'Non vérifiée'}
                </button>
                <button onClick={() => setEdit(f)} className="text-xs text-nextiaa-orange">
                  Modifier
                </button>
                <button onClick={() => remove(f.id)} className="text-xs text-red-500">
                  Suppr.
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FicheForm({
  fiche,
  onChange,
  onSave,
  onCancel,
}: {
  fiche: KbFiche;
  onChange: (f: KbFiche) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<KbFiche>) => onChange({ ...fiche, ...patch });
  return (
    <div className="space-y-2 rounded-xl border border-nextiaa-orange bg-orange-50 p-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <input value={fiche.id} onChange={(e) => set({ id: e.target.value })} placeholder="id (unique)" className="rounded border px-2 py-1" />
        <select value={fiche.category} onChange={(e) => set({ category: e.target.value })} className="rounded border px-2 py-1">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input value={fiche.title} onChange={(e) => set({ title: e.target.value })} placeholder="titre" className="col-span-2 rounded border px-2 py-1" />
        <select
          value={fiche.operator ?? ''}
          onChange={(e) => set({ operator: e.target.value || null })}
          className="rounded border px-2 py-1"
        >
          <option value="">(aucun opérateur)</option>
          <option value="orange">orange</option>
          <option value="mtn">mtn</option>
        </select>
        <input value={fiche.source ?? ''} onChange={(e) => set({ source: e.target.value })} placeholder="source" className="rounded border px-2 py-1" />
      </div>
      <textarea
        value={fiche.content}
        onChange={(e) => set({ content: e.target.value })}
        placeholder="contenu"
        rows={4}
        className="w-full rounded border px-2 py-1"
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!fiche.verified} onChange={(e) => set({ verified: e.target.checked })} />
        Vérifiée
      </label>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!fiche.id || !fiche.title} className="rounded bg-nextiaa-orange px-4 py-1 font-semibold text-white disabled:opacity-40">
          Enregistrer
        </button>
        <button onClick={onCancel} className="rounded border px-4 py-1">
          Annuler
        </button>
      </div>
    </div>
  );
}
