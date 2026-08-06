// Utilitaires image côté client : compression avant envoi (connexions faibles)
// + contrôle qualité local pour éviter des appels Gemini inutiles (CDC B.2 / §4).

export interface QualityResult {
  ok: boolean;
  brightness: number; // 0-255
  sharpness: number; // variance ~ netteté
  faceDetected: boolean | null; // null si l'API n'est pas dispo
  reason: "ok" | "dark" | "blurry" | "no_face";
}

/** Redimensionne + compresse une image en data URL JPEG. */
export async function compressImage(
  source: Blob | HTMLVideoElement | HTMLImageElement,
  maxSize = 1024,
  quality = 0.82,
): Promise<string> {
  const bitmap = await toBitmap(source);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Génère une vignette carrée compacte pour l'historique. */
export async function makeThumbnail(dataUrl: string, size = 160): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const min = Math.min(img.width, img.height);
  const sx = (img.width - min) / 2;
  const sy = (img.height - min) / 2;
  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.7);
}

/**
 * Contrôle qualité : luminosité, netteté (variance des gradients) et présence
 * d'un visage si l'API FaceDetector est disponible.
 */
export async function checkQuality(
  source: HTMLVideoElement | HTMLImageElement | string,
): Promise<QualityResult> {
  const img =
    typeof source === "string" ? await loadImage(source) : source;

  const sample = 256;
  const canvas = document.createElement("canvas");
  canvas.width = sample;
  canvas.height = sample;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img as CanvasImageSource, 0, 0, sample, sample);
  const { data } = ctx.getImageData(0, 0, sample, sample);

  // Luminosité moyenne (luma).
  let sum = 0;
  const gray = new Float32Array(sample * sample);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = luma;
    sum += luma;
  }
  const brightness = sum / (sample * sample);

  // Netteté : variance du gradient horizontal+vertical (proxy du Laplacien).
  let gsum = 0;
  let gsum2 = 0;
  let n = 0;
  for (let y = 1; y < sample - 1; y++) {
    for (let x = 1; x < sample - 1; x++) {
      const idx = y * sample + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + sample] - gray[idx - sample];
      const g = Math.abs(gx) + Math.abs(gy);
      gsum += g;
      gsum2 += g * g;
      n++;
    }
  }
  const mean = gsum / n;
  const sharpness = gsum2 / n - mean * mean;

  // Détection de visage (best-effort, l'API n'est pas partout).
  let faceDetected: boolean | null = null;
  const FD = (globalThis as any).FaceDetector;
  if (typeof FD === "function") {
    try {
      const detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      faceDetected = Array.isArray(faces) && faces.length > 0;
    } catch {
      faceDetected = null;
    }
  }

  let reason: QualityResult["reason"] = "ok";
  let ok = true;
  if (brightness < 55) {
    ok = false;
    reason = "dark";
  } else if (sharpness < 90) {
    ok = false;
    reason = "blurry";
  } else if (faceDetected === false) {
    ok = false;
    reason = "no_face";
  }

  return { ok, brightness, sharpness, faceDetected, reason };
}

// --- helpers ---------------------------------------------------------------

async function toBitmap(
  source: Blob | HTMLVideoElement | HTMLImageElement,
): Promise<{ width: number; height: number } & CanvasImageSource> {
  if (source instanceof Blob) {
    return (await createImageBitmap(source)) as ImageBitmap;
  }
  if (source instanceof HTMLVideoElement) {
    return Object.assign(source, {
      width: source.videoWidth,
      height: source.videoHeight,
    }) as unknown as { width: number; height: number } & CanvasImageSource;
  }
  return source as unknown as {
    width: number;
    height: number;
  } & CanvasImageSource;
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
