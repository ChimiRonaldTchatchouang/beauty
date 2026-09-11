import { useCall } from './lib/useCall.js';

/** Wordmark « Nextiaa » : N initial et point final en orange. */
function Wordmark() {
  return (
    <span className="text-2xl font-bold tracking-tight text-nextiaa-black">
      <span className="text-nextiaa-orange">N</span>extiaa<span className="text-nextiaa-orange">.</span>
    </span>
  );
}

/**
 * J1 : écran de test minimal de la boucle audio.
 * Bouton « Parler » → appelle le 8000 → conversation voix-à-voix.
 * Le téléphone simulé complet est construit au J2.
 */
export default function App() {
  const { state, start, hangup, toggleMute } = useCall();
  const active = state.status === 'connecting' || state.status === 'connected' || state.status === 'ringing';

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <Wordmark />
        <span className="text-xs text-gray-500">Boucle audio (J1)</span>
      </header>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-gray-600">
          Appuyez sur « Parler » pour appeler l'assistant au <strong>8000</strong> et discuter en français.
          Coupez la parole à l'assistant : sa voix doit s'arrêter immédiatement.
        </p>

        <div className="flex items-center gap-3">
          {!active ? (
            <button
              className="rounded-full bg-nextiaa-orange px-6 py-3 font-semibold text-white shadow hover:opacity-90"
              onClick={() =>
                void start({ dialed: '8000', callerNumber: '+237600000000', simOperator: 'orange', phoneQualityMode: false })
              }
            >
              📞 Parler à l'assistant
            </button>
          ) : (
            <>
              <button
                className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white shadow hover:opacity-90"
                onClick={() => void hangup()}
              >
                Raccrocher
              </button>
              <button
                className="rounded-full border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                onClick={toggleMute}
              >
                {state.muted ? 'Réactiver le micro' : 'Couper le micro'}
              </button>
            </>
          )}
          <StatusBadge status={state.status} />
        </div>

        {state.error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      </div>

      <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-800">Transcription en direct</h2>
        {state.transcripts.length === 0 ? (
          <p className="text-sm text-gray-400">La transcription apparaîtra ici pendant l'appel.</p>
        ) : (
          <ul className="space-y-2">
            {state.transcripts.map((l) => (
              <li key={l.id} className="text-sm">
                <span className={l.who === 'agent' ? 'font-semibold text-nextiaa-orange' : 'font-semibold text-gray-700'}>
                  {l.who === 'agent' ? 'Assistant' : 'Vous'} :{' '}
                </span>
                <span className={l.final ? 'text-gray-800' : 'text-gray-400'}>{l.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">
        ⚠️ Données de démonstration fictives uniquement. Ne saisissez aucune donnée réelle.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    idle: 'Prêt',
    connecting: 'Connexion…',
    ringing: 'Sonnerie…',
    connected: 'En ligne',
    ended: 'Terminé',
    error: 'Erreur',
  };
  return <span className="ml-auto text-sm text-gray-500">{label[status] ?? status}</span>;
}
