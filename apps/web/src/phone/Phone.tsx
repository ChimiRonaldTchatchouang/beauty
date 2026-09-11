import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimOperator } from '@nextiaa/shared';
import { useCall } from '../lib/useCall.js';
import { useServerConfig } from '../lib/config.js';
import { Tones } from '../audio/ringtone.js';
import { PhoneFrame } from './PhoneFrame.js';
import { Dialer } from './Dialer.js';
import { InCall } from './InCall.js';
import { SmsApp } from './SmsApp.js';
import { UssdDialog } from './UssdDialog.js';
import { IncomingCall } from './IncomingCall.js';
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

type Phase = 'home' | 'incall' | 'ended' | 'incoming';

const USSD_MENU = "Nextiaa Voice — 1. Parler à l'assistant, 2. Recevoir le menu par SMS";
const USSD_SMS_BODY =
  "Nextiaa Voice (démo) — Menu : composez le 8000 pour parler à notre assistant automatique. " +
  "Informations et données de démonstration fictives.";

/**
 * Téléphone simulé (route /). Profil de test en haut, cadre smartphone
 * (clavier / écran d'appel), panneau de transcription (à droite sur ordinateur).
 */
export default function Phone() {
  const cfg = useServerConfig();
  const { state, start, hangup, toggleMute, pushLocalSms } = useCall();
  const [phase, setPhase] = useState<Phase>('home');
  const [showUssd, setShowUssd] = useState(false);
  const [operator, setOperator] = useState<SimOperator>('orange');
  const [callerNumber, setCallerNumber] = useState(FICTIONAL_NUMBERS[0]!.value);
  const [phoneQuality, setPhoneQuality] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSms, setShowSms] = useState(false);
  const [seenSms, setSeenSms] = useState(0);
  const tonesRef = useRef<Tones | null>(null);

  const unreadSms = state.sms.length - seenSms;
  const openSms = () => {
    setShowSms(true);
    setSeenSms(state.sms.length);
  };

  const getTones = () => (tonesRef.current ??= new Tones());

  // Sonnerie (ringback) pendant l'établissement de l'appel.
  useEffect(() => {
    const t = getTones();
    const establishing = phase === 'incall' && (state.status === 'connecting' || state.status === 'ringing');
    if (establishing || phase === 'incoming') {
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
      // Parcours USSD : ouvre le menu de type USSD.
      if (dialed === cfg.ussdCode) {
        setShowUssd(true);
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

  // Choix dans le menu USSD.
  const onUssdSelect = useCallback(
    (option: number) => {
      setShowUssd(false);
      if (option === 1) {
        // « Parler à l'assistant » → rappel entrant après 3 s (sans crédit).
        setNotice('Vous allez être rappelé…');
        setTimeout(() => {
          setNotice(null);
          setPhase('incoming');
        }, 3000);
      } else if (option === 2) {
        // « Recevoir le menu par SMS » → SMS local simulé.
        pushLocalSms('Nextiaa Voice', USSD_SMS_BODY);
        setNotice('Le menu vous a été envoyé par SMS.');
      }
    },
    [pushLocalSms],
  );

  // Décrocher le rappel USSD → appel en mode « rappel USSD ».
  const acceptIncoming = useCallback(() => {
    setPhase('incall');
    void start({
      dialed: cfg.demoNumbers[0] ?? '8000',
      callerNumber,
      simOperator: operator,
      phoneQualityMode: phoneQuality,
      accessMode: 'ussd_callback',
    });
  }, [cfg.demoNumbers, callerNumber, operator, phoneQuality, start]);

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
            {/* Notification SMS en haut de l'écran. */}
            {unreadSms > 0 && !showSms && (
              <button
                onClick={openSms}
                className="mx-2 mt-2 flex items-center gap-2 rounded-lg bg-nextiaa-orange px-3 py-2 text-left text-sm text-white shadow"
              >
                ✉️ {unreadSms} nouveau{unreadSms > 1 ? 'x' : ''} SMS — appuyez pour ouvrir
              </button>
            )}

            {showUssd && (
              <UssdDialog
                title={USSD_MENU}
                options={[
                  { index: 1, label: "Parler à l'assistant" },
                  { index: 2, label: 'Recevoir le menu par SMS' },
                ]}
                onSelect={onUssdSelect}
                onCancel={() => setShowUssd(false)}
              />
            )}

            {showSms ? (
              <SmsApp messages={state.sms} onClose={() => setShowSms(false)} />
            ) : phase === 'incoming' ? (
              <IncomingCall onAccept={acceptIncoming} onReject={() => setPhase('home')} />
            ) : phase === 'incall' ? (
              <InCall
                status={state.status}
                muted={state.muted}
                latencyMs={state.lastLatencyMs}
                onToggleMute={toggleMute}
                onHangup={onHangup}
              />
            ) : phase === 'ended' ? (
              <EndedScreen reason={state.error ?? state.lastEndReason} onBack={() => setPhase('home')} />
            ) : (
              <>
                <Dialer onCall={call} />
                <button onClick={openSms} className="mb-3 mx-auto flex items-center gap-2 text-sm text-gray-500">
                  ✉️ Messages{state.sms.length > 0 ? ` (${state.sms.length})` : ''}
                </button>
              </>
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
