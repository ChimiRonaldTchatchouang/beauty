import type { SmsMessage } from '../lib/useCall.js';

/** Application SMS du téléphone : liste des SMS simulés reçus. */
export function SmsApp({ messages, onClose }: { messages: SmsMessage[]; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={onClose} aria-label="Retour" className="text-nextiaa-orange">
          ←
        </button>
        <h2 className="font-semibold text-gray-800">Messages</h2>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-gray-400">Aucun SMS reçu.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-nextiaa-orange">{m.from}</span>
                <span className="text-[10px] text-gray-400">{new Date(m.at).toLocaleString('fr-FR')}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{m.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
