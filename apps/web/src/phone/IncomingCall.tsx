/** Écran d'appel entrant (rappel USSD) : décrocher / refuser. */
export function IncomingCall({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-between bg-gradient-to-b from-gray-900 to-black px-6 py-12 text-white">
      <div className="mt-10 flex flex-col items-center gap-2">
        <p className="text-sm text-gray-300">Appel entrant · rappel</p>
        <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-nextiaa-orange text-4xl font-bold">
          N.
        </div>
        <h2 className="mt-2 text-2xl font-semibold">Nextiaa Voice</h2>
        <p className="text-[11px] text-gray-500">Assistant automatique</p>
      </div>

      <div className="flex w-full max-w-[240px] justify-between">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onReject}
            aria-label="Refuser"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl"
          >
            📴
          </button>
          <span className="text-[11px] text-gray-300">Refuser</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onAccept}
            aria-label="Décrocher"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-2xl"
          >
            📞
          </button>
          <span className="text-[11px] text-gray-300">Décrocher</span>
        </div>
      </div>
    </div>
  );
}
