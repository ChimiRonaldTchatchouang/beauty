import { useState } from 'react';

const KEYS = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
] as const;

/** Clavier de numérotation avec bouton d'appel vert. */
export function Dialer({ onCall }: { onCall: (dialed: string) => void }) {
  const [value, setValue] = useState('');

  const press = (k: string) => setValue((v) => (v.length < 20 ? v + k : v));
  const backspace = () => setValue((v) => v.slice(0, -1));

  return (
    <div className="flex flex-1 flex-col items-center justify-between px-6 py-4">
      <div className="flex h-16 w-full items-center justify-center">
        <span className="text-3xl font-light tracking-wider text-gray-900">{value || ' '}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map(([digit, sub]) => (
          <button
            key={digit}
            onClick={() => press(digit)}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-gray-100 text-2xl font-medium text-gray-900 active:bg-gray-200"
          >
            {digit}
            {sub && <span className="text-[9px] font-normal tracking-widest text-gray-400">{sub}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 flex w-full items-center justify-center gap-6">
        <span className="h-12 w-12" />
        <button
          onClick={() => value && onCall(value)}
          disabled={!value}
          aria-label="Appeler"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-2xl text-white shadow-lg disabled:opacity-40"
        >
          📞
        </button>
        <button
          onClick={backspace}
          aria-label="Effacer"
          className="flex h-12 w-12 items-center justify-center text-xl text-gray-400 disabled:opacity-0"
          disabled={!value}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
