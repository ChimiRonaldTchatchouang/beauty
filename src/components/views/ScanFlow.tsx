"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { compressImage, makeThumbnail, checkQuality, type QualityResult } from "@/lib/image";
import { ResultsView } from "./ResultsView";
import { CameraIcon, UploadIcon } from "@/components/icons";
import type { ScanAnalysis } from "@/lib/db/schema";

type Phase = "camera" | "preview" | "analyzing" | "results" | "error";

export function ScanFlow({ quotaReached }: { quotaReached: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [tip, setTip] = useState<string>("");
  const [captured, setCaptured] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Démarrage caméra frontale.
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
      setCameraReady(false); // pas de caméra → l'utilisateur importera une photo
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (phase === "camera" && !quotaReached) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quotaReached]);

  // Analyse qualité en direct (tips) toutes les ~700ms.
  useEffect(() => {
    if (phase !== "camera" || !cameraReady) return;
    const id = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0) return;
      const q = await checkQuality(v);
      setTip(tipFor(q));
    }, 700);
    return () => clearInterval(id);
  }, [phase, cameraReady]);

  function tipFor(q: QualityResult): string {
    if (q.reason === "dark") return t.scan.tipLight;
    if (q.reason === "blurry") return t.scan.tipBlurry;
    if (q.reason === "no_face") return t.scan.tipNoFace;
    return t.scan.tipGood;
  }

  async function capture() {
    const v = videoRef.current;
    if (!v) return;
    const quality = await checkQuality(v);
    if (!quality.ok) {
      setError(t.scan.qualityFail + " " + tipFor(quality));
      return;
    }
    setError(null);
    const dataUrl = await compressImage(v);
    setCaptured(dataUrl);
    stopCamera();
    await analyze(dataUrl, quality);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    const quality = await checkQuality(dataUrl);
    if (!quality.ok) {
      setError(t.scan.qualityFail + " " + tipFor(quality));
      return;
    }
    setError(null);
    setCaptured(dataUrl);
    stopCamera();
    await analyze(dataUrl, quality);
  }

  // Envoi + retry réseau (connexions faibles).
  async function analyze(image: string, quality: QualityResult) {
    setPhase("analyzing");
    const thumbnail = await makeThumbnail(image).catch(() => null);

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, thumbnail, quality }),
        });
        if (res.status === 402) {
          setError(t.scan.quotaReached);
          setPhase("error");
          return;
        }
        if (res.status === 403) {
          router.push("/consent");
          return;
        }
        if (!res.ok) throw new Error("server");
        const data = await res.json();
        setAnalysis(data.analysis as ScanAnalysis);
        setPhase("results");
        router.refresh(); // met à jour quota / historique
        return;
      } catch {
        attempt++;
        if (attempt >= maxAttempts) {
          setError(t.auth.error);
          setPhase("error");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }

  function reset() {
    setCaptured(null);
    setAnalysis(null);
    setError(null);
    setPhase("camera");
  }

  // ---- Rendu -------------------------------------------------------------

  if (quotaReached && phase === "camera") {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="mb-4 text-5xl">⏳</div>
        <h1 className="text-xl font-bold">{t.scan.quotaReached}</h1>
        <Link href="/profile" className="btn-primary mt-6">
          {t.profile.subscription}
        </Link>
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative mb-8 grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 rounded-full bg-brand-300 opacity-40 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-brand-300 opacity-40 animate-pulse-ring [animation-delay:0.5s]" />
          {captured && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={captured} alt="" className="relative h-24 w-24 rounded-full object-cover" />
          )}
        </div>
        <h1 className="text-xl font-bold">{t.scan.analyzing}</h1>
        <p className="mt-2 text-ink-soft">{t.scan.analyzingSub}</p>
      </div>
    );
  }

  if (phase === "results" && analysis) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t.results.title}</h1>
        <ResultsView analysis={analysis} image={captured} />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="mb-4 text-5xl">😕</div>
        <p className="text-ink-soft">{error}</p>
        <button onClick={reset} className="btn-primary mt-6">
          {t.common.retry}
        </button>
      </div>
    );
  }

  // phase === "camera"
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{t.scan.title}</h1>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-ink">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {/* Cadre de guidage ovale */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-[68%] w-[58%] rounded-[50%] border-[3px] border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {/* Conseils en direct */}
        {cameraReady && tip && (
          <div className="absolute inset-x-0 top-4 flex justify-center">
            <span className="rounded-full bg-black/55 px-4 py-1.5 text-sm font-medium text-white">
              {tip}
            </span>
          </div>
        )}
        {!cameraReady && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/90">
            <p>{t.scan.import}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-brand-50 p-3 text-center text-sm text-brand-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="grid h-14 w-14 place-items-center rounded-full border border-sand-200 bg-white text-ink-soft"
          aria-label={t.scan.import}
        >
          <UploadIcon width={24} height={24} />
        </button>

        <button
          onClick={capture}
          disabled={!cameraReady}
          className="grid h-20 w-20 place-items-center rounded-full bg-brand-500 text-white shadow-soft ring-4 ring-brand-100 transition active:scale-95 disabled:opacity-40"
          aria-label={t.scan.capture}
        >
          <CameraIcon width={34} height={34} />
        </button>

        <div className="h-14 w-14" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
