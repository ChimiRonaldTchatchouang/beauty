import { useEffect, useRef } from 'react';
import type { TranscriptLine } from '../lib/useCall.js';

/** Panneau de transcription en direct (console navigateur / vue bureau). */
export function TranscriptPanel({ lines }: { lines: TranscriptLine[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Transcription en direct</h2>
      {lines.length === 0 ? (
        <p className="text-sm text-gray-400">La transcription apparaîtra ici pendant l'appel.</p>
      ) : (
        <ul className="space-y-2 overflow-y-auto">
          {lines.map((l) => (
            <li key={l.id} className="text-sm leading-snug">
              <span className={l.who === 'agent' ? 'font-semibold text-nextiaa-orange' : 'font-semibold text-gray-700'}>
                {l.who === 'agent' ? 'Assistant' : 'Vous'} :{' '}
              </span>
              <span className={l.final ? 'text-gray-800' : 'text-gray-400'}>{l.text}</span>
            </li>
          ))}
          <div ref={endRef} />
        </ul>
      )}
    </div>
  );
}
