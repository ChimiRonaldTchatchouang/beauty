"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/context";
import { compressImage, makeThumbnail, checkQuality, type QualityResult } from "@/lib/image";
import { ResultsView } from "@/components/views/ResultsView";
import { ScanOverlay } from "./ScanOverlay";
import { CameraIcon, UploadIcon } from "@/components/icons";
import { sendResults } from "@/lib/actions/center";
import type { ScanAnalysis } from "@/lib/db/schema";

interface Patient {
  id: string;
  name: string | null;
  email: string;
}

type Phase = "select" | "camera" | "analyzing" | "results" | "error";

const POSES = [
  { key: "front", label: "Face", hint: "Regardez droit devant vous", emoji: "😊" },
  { key: "left", label: "Profil gauche", hint: "Tournez lentement la tête vers la gauche", emoji: "⬅️" },
  { key: "right", label: "Profil droit", hint: "Tournez lentement la tête vers la droite", emoji: "➡️" },
] as const;

function Flow({ patients, preselected }: { patients: Patient[]; preselected: string | null }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [patientId, setPatientId] = useState<string | null>(preselected);
  const [phase, setPhase] = useState<Phase>(preselected ? "camera" : "select");
  const [poseIndex, setPoseIndex] = useState(0);
  const [captures, setCaptures] = useState<string[]>([]);
  const [tip, setTip] = useState("");
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const patient = patients.find((p) => p.id === patientId);
  const pose = POSES[poseIndex];

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (phase === "camera") startCamera();
    return () => stopCamera();
  }, [phase, startCamera, stopCamera]);

  useEffect(() => {
    if (phase !== "camera" || !cameraReady) return;
    const id = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0) return;
      setTip(tipFor(await checkQuality(v)));
    }, 800);
    return () => clearInterval(id);
  }, [phase, cameraReady]);

  function tipFor(q: QualityResult) {
    if (q.reason === "dark") return "Rapprochez-vous de la lumière";
    if (q.reason === "blurry") return "Tenez l'appareil stable";
    if (q.reason === "no_face") return "Centrez le visage dans le cadre";
    return "Qualité OK ✓";
  }

  async function addCapture(dataUrl: string) {
    const next = [...captures, dataUrl];
    setCaptures(next);
    if (poseIndex < POSES.length - 1) {
      setPoseIndex(poseIndex + 1);
    } else {
      stopCamera();
      await analyze(next);
    }
  }

  async function capture() {
    const v = videoRef.current;
    if (!v || busy) return;
    setBusy(true);
    try {
      const quality = await checkQuality(v);
      if (!quality.ok) {
        setError("Photo trop sombre ou floue. " + tipFor(quality));
        return;
      }
      setError(null);
      const dataUrl = await compressImage(v);
      await addCapture(dataUrl);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      const quality = await checkQuality(dataUrl);
      if (!quality.ok) {
        setError("Photo trop sombre ou floue. " + tipFor(quality));
        return;
      }
      setError(null);
      await addCapture(dataUrl);
    } finally {
      setBusy(false);
    }
  }

  async function analyze(images: string[]) {
    setPhase("analyzing");
    const thumbnail = await makeThumbnail(images[0]).catch(() => null);
    const quality = await checkQuality(images[0]).catch(() => ({ ok: true }) as QualityResult);
    let attempt = 0;
    while (attempt < 3) {
      try {
        const res = await fetch("/api/center/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, images, thumbnail, quality }),
        });
        if (res.status === 402) {
          setError("Quota de scans atteint ou licence inactive.");
          setPhase("error");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Message clair (souvent : quota/facturation Gemini).
          setError(data.hint || data.detail || "L'analyse IA a échoué.");
          setPhase("error");
          return;
        }
        setAnalysis(data.analysis as ScanAnalysis);
        setScanId(data.id as string);
        setPhase("results");
        router.refresh();
        return;
      } catch {
        attempt++;
        if (attempt >= 3) {
          setError("Problème de connexion. Vérifiez le réseau et réessayez.");
          setPhase("error");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }

  async function doSend() {
    if (!scanId) return;
    setSending(true);
    const res = await sendResults(scanId);
    setSending(false);
    if (res.ok) setSent(true);
    else setError(res.error ?? "Échec de l'envoi.");
  }

  function reset() {
    setCaptures([]);
    setPoseIndex(0);
    setAnalysis(null);
    setScanId(null);
    setError(null);
    setSent(false);
    setPhase("camera");
  }

  // ---- Rendu -------------------------------------------------------------

  if (phase === "select") {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-2xl font-bold">Scanner un patient</h1>
        <p className="mb-4 text-sm text-ink-soft">Sélectionnez le patient à scanner.</p>
        {patients.length === 0 ? (
          <div className="card text-center">
            <p className="font-semibold">Aucun patient</p>
            <Link href="/center/patients" className="btn-primary mt-4">Ajouter un patient</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPatientId(p.id); setPhase("camera"); }}
                className="card flex items-center gap-3 text-left"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                  {(p.name?.[0] ?? p.email[0]).toUpperCase()}
                </span>
                <span className="font-medium">{p.name ?? p.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative mb-8 h-28 w-28 overflow-hidden rounded-3xl">
          {captures[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={captures[0]} alt="" className="h-full w-full object-cover" />
          )}
          <div className="scan-line" />
        </div>
        <h1 className="text-xl font-bold">Analyse en cours…</h1>
        <p className="mt-2 text-ink-soft">Notre IA examine la peau ({captures.length} photo{captures.length > 1 ? "s" : ""})…</p>
      </div>
    );
  }

  if (phase === "results" && analysis) {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Résultats — {patient?.name ?? patient?.email}</h1>
          <div className="flex gap-2">
            <button onClick={reset} className="btn-ghost">Nouveau scan</button>
            <button onClick={doSend} disabled={sending || sent} className="btn-primary">
              {sent ? "✓ Envoyé" : sending ? "Envoi…" : "📧 Envoyer au patient"}
            </button>
          </div>
        </div>
        {error && <p className="mb-3 rounded-2xl bg-brand-50 p-3 text-sm text-brand-700">{error}</p>}
        <ResultsView analysis={analysis} image={captures[0]} showRoutineCta={false} />
        <div className="mt-6">
          <Link href={`/center/patients/${patientId}`} className="text-sm font-medium text-brand-600">
            → Voir la fiche patient
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="mb-4 text-5xl">😕</div>
        <p className="text-ink-soft">{error}</p>
        <button onClick={reset} className="btn-primary mt-6">Réessayer</button>
        <Link href={`/center/patients/${patientId}`} className="mt-3 block text-sm text-ink-faint">
          Retour à la fiche patient
        </Link>
      </div>
    );
  }

  // ---- camera (multi-poses) ----
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">Scanner</h1>
      <p className="mb-3 text-sm text-ink-soft">Patient : {patient?.name ?? patient?.email}</p>

      {/* Progression des poses */}
      <div className="mb-3 flex items-center justify-center gap-2">
        {POSES.map((p, i) => (
          <div
            key={p.key}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              i < captures.length
                ? "bg-green-100 text-green-700"
                : i === poseIndex
                  ? "bg-brand-500 text-white"
                  : "bg-sand-100 text-ink-faint"
            }`}
          >
            {i < captures.length ? "✓" : p.emoji} {p.label}
          </div>
        ))}
      </div>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-ink">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {cameraReady && <ScanOverlay active={!busy} />}

        {/* Consigne de pose */}
        <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-1">
          <span className="rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold text-white">
            {pose.emoji} {pose.hint}
          </span>
          {cameraReady && tip && (
            <span className="rounded-full bg-black/40 px-3 py-0.5 text-xs text-white/90">{tip}</span>
          )}
        </div>

        {!cameraReady && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/90">
            <p>Autorisez la caméra ou importez une photo</p>
          </div>
        )}
      </div>

      {error && <p className="mt-3 rounded-2xl bg-brand-50 p-3 text-center text-sm text-brand-700">{error}</p>}

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="grid h-14 w-14 place-items-center rounded-full border border-sand-200 bg-white text-ink-soft"
          aria-label="Importer"
        >
          <UploadIcon width={24} height={24} />
        </button>
        <button
          onClick={capture}
          disabled={!cameraReady || busy}
          className="grid h-20 w-20 place-items-center rounded-full bg-brand-500 text-white shadow-soft ring-4 ring-brand-100 transition active:scale-95 disabled:opacity-40"
          aria-label="Capturer"
        >
          <CameraIcon width={34} height={34} />
        </button>
        <div className="h-14 w-14" />
      </div>
      <p className="mt-3 text-center text-xs text-ink-faint">
        Photo {Math.min(captures.length + 1, POSES.length)} sur {POSES.length}
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
    </div>
  );
}

export function CenterScanFlow(props: { patients: Patient[]; preselected: string | null }) {
  return (
    <I18nProvider initialLang="fr">
      <Flow {...props} />
    </I18nProvider>
  );
}
