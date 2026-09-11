import { useEffect, useRef, useState } from 'react';
import type { CallStatus } from '../lib/useCall.js';

function fmt(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  status: CallStatus;
  muted: boolean;
  latencyMs: number | null;
  onToggleMute: () => void;
  onHangup: () => void;
}

/** Écran d'appel : nom, chronomètre, boutons muet / haut-parleur (visuel) / raccrocher. */
export function InCall({ status, muted, latencyMs, onToggleMute, onHangup }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [speaker, setSpeaker] = useState(false);
  const startedRef = useRef<number | null>(null);

  // Le chronomètre démarre à la connexion.
  useEffect(() => {
    if (status !== 'connected') return;
    if (startedRef.current === null) startedRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedRef.current ?? Date.now())) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [status]);

  const subtitle =
    status === 'connecting' ? 'Connexion…' : status === 'ringing' ? 'Sonnerie…' : fmt(elapsed);

  return (
    <div className="flex flex-1 flex-col items-center justify-between bg-gradient-to-b from-gray-900 to-black px-6 py-10 text-white">
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-nextiaa-orange text-4xl font-bold">
          N.
        </div>
        <h2 className="mt-2 text-2xl font-semibold">Nextiaa Voice</h2>
        <p className="text-sm text-gray-300">{subtitle}</p>
        <p className="text-[11px] text-gray-500">Assistant automatique</p>
        {latencyMs !== null && status === 'connected' && (
          <p className={`text-[11px] ${latencyMs < 1000 ? 'text-green-400' : 'text-amber-400'}`}>
            Latence dernier tour : {latencyMs} ms
          </p>
        )}
      </div>

      <div className="grid w-full max-w-[240px] grid-cols-3 gap-4">
        <ActionButton active={muted} onClick={onToggleMute} label={muted ? 'Muet' : 'Micro'} icon={muted ? '🔇' : '🎙️'} />
        <ActionButton active={speaker} onClick={() => setSpeaker((s) => !s)} label="H.-parleur" icon="🔊" />
        <ActionButton active={false} onClick={() => undefined} label="Clavier" icon="⌨️" disabled />
      </div>

      <button
        onClick={onHangup}
        aria-label="Raccrocher"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl shadow-lg active:bg-red-700"
      >
        📴
      </button>
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  label,
  icon,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-1 disabled:opacity-30">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full text-xl ${
          active ? 'bg-white text-black' : 'bg-white/15 text-white'
        }`}
      >
        {icon}
      </span>
      <span className="text-[11px] text-gray-300">{label}</span>
    </button>
  );
}
