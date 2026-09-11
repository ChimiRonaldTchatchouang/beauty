import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimOperator } from '@nextiaa/shared';
import { useCall } from '../lib/useCall.js';
import { useServerConfig } from '../lib/config.js';
import { Tones } from '../audio/ringtone.js';
import { PhoneFrame } from './PhoneFrame.js';
import { Dialer } from './Dialer.js';
import { InCall } from './InCall.js';
import { TranscriptPanel } from './TranscriptPanel.js';
import { FICTIONAL_NUMBERS, OPERATORS } from './profile.js';

/** Wordmark « Nextiaa ». */
function Wordmark() {
  return (
    <span className="text-xl font-bold tracking-tight text-nextiaa-black">
      <span className="text-nextiaa-orange">N</span>extiaa<span className="text-nextiaa-orange">.</span>
    </span>
  );
}

type Phase = 'home' | 'incall' | 'ended';

/**
 * Téléphone simulé (route /). Profil de test en haut, cadre smartphone
 * (clavier / écran d'appel), panneau de transcription (à droite sur ordinateur).
 */
export default function Phone() {
  const cfg = useServerConfig();
  const { state, start, hangup, toggleMute } = useCall();
  const [phase, setPhase] = useState<Phase>('home');
  const [operator, setOperator] = useState<SimOperator>('orange');
  const [callerNumber, setCallerNumber] = useState(FICTIONAL_NUMBERS[0]!.value);
  const [phoneQuality, setPhoneQuality] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const tonesRef = useRef<Tones | null>(null);

  const getTones = () => (tonesRef.current ??= new Tones());

  // Sonnerie (ringback) pendant l'établissement de l'appel.
  useEffect(() => {
    const t = getTones();
    if (phase === 'incall' && (state.status === 'connecting' || state.status === 'ringing')) {
      t.startRinging();
    } else {
      t.stopRinging();
    }
  }, [phase, state.status]);

  // Bip d'erreur en cas de quota / coupure.
  useEffect(() => {
    if (state.status === 'error') getTones().errorBeep();
  }, [state.status]);

  useEffect(() => () => tonesRef.current?.dispose(), []);

  const call = useCallback(
    (dialed: string) => {
      setNotice(null);
      // USSD : implémenté au jalon J6.
      if (dialed === cfg.ussdCode) {
        setNotice(`Le parcours USSD (${cfg.ussdCode}) sera disponible au jalon 6.`);
        return;
      }
      if (!cfg.demoNumbers.includes(dialed)) {
        setNotice("Ce numéro n'est pas attribué.");
        return;
      }
      setPhase('incall');
      void start({ dialed, callerNumber, simOperator: operator, phoneQualityMode: phoneQuality });
    },
    [cfg, callerNumber, operator, phoneQuality, start],
  );

  const onHangup = useCallback(() => {
    void hangup();
    setPhase('ended');
  }, [hangup]);

  // Retour à l'accueil après la fin de l'appel.
  useEffect(() => {
    if ((state.status === 'ended' || state.status === 'error') && phase === 'incall') {
      setPhase('ended');
    }
  }, [state.status, phase]);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <Wordmark />
        <a href="/console" className="text-xs text-gray-500 hover:text-nextiaa-orange">
          Console →
        </a>
      </header>

      {/* Profil de test */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
        <span className="font-semibold text-gray-700">Profil de test :</span>
        <label className="flex items-center gap-1">
          SIM
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as SimOperator)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            {OPERATORS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Numéro
          <select
            value={callerNumber}
            onChange={(e) => setCallerNumber(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            {FICTIONAL_NUMBERS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={phoneQuality} onChange={(e) => setPhoneQuality(e.target.checked)} />
          Mode qualité téléphone
        </label>
        <span className="text-xs text-gray-400">Appelez le {cfg.demoNumbers.join(', ')}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[380px_1fr]">
        <div>
          <PhoneFrame>
            {phase === 'incall' ? (
              <InCall status={state.status} muted={state.muted} onToggleMute={toggleMute} onHangup={onHangup} />
            ) : phase === 'ended' ? (
              <EndedScreen reason={state.error ?? state.lastEndReason} onBack={() => setPhase('home')} />
            ) : (
              <Dialer onCall={call} />
            )}
          </PhoneFrame>
          {notice && <p className="mt-2 rounded bg-amber-50 p-2 text-center text-sm text-amber-800">{notice}</p>}
        </div>

        <div className="min-h-[300px]">
          <TranscriptPanel lines={state.transcripts} />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        ⚠️ Données de démonstration fictives uniquement. Ne saisissez aucune donnée réelle.
      </p>
    </div>
  );
}

function EndedScreen({ reason, onBack }: { reason: string | null; onBack: () => void }) {
  const isError = reason && !['client_hangup', 'max_duration', 'socket_closed'].includes(reason);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">{isError ? '⚠️' : '📴'}</div>
      <h2 className="text-lg font-semibold text-gray-800">Appel terminé</h2>
      {isError && <p className="text-sm text-red-600">{reason}</p>}
      <button onClick={onBack} className="rounded-full bg-nextiaa-orange px-6 py-2 font-semibold text-white">
        Retour
      </button>
    </div>
  );
}
