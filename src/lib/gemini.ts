import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ScanAnalysis, ScanMetricResult, Severity } from "./db/schema";

// Catégories que l'IA doit toujours renvoyer, dans cet ordre.
export const METRIC_CATEGORIES = [
  "acne",
  "dark_spots",
  "wrinkles",
  "pores",
  "redness",
  "hydration",
  "evenness",
] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

const SYSTEM_PROMPT = `Tu es un assistant d'analyse cosmétique de la peau (esthétique uniquement, JAMAIS de diagnostic médical ou pathologique).
On te fournit une photo de visage. Analyse UNIQUEMENT des aspects cosmétiques visibles.

Tu dois répondre STRICTEMENT en JSON valide (aucun texte hors JSON, pas de markdown, pas de \`\`\`), au format exact suivant :
{
  "overallScore": <entier 0-100, 100 = peau visiblement en très bonne santé>,
  "summary": "<1 phrase courte et bienveillante en français décrivant l'état général>",
  "metrics": [
    {
      "category": "acne" | "dark_spots" | "wrinkles" | "pores" | "redness" | "hydration" | "evenness",
      "score": <entier 0-100, 100 = aucun problème sur ce critère>,
      "severity": "none" | "low" | "medium" | "high",
      "zone": "<front | joues | nez | menton | contour_yeux | global>",
      "explanation": "<explication pédagogique très simple en français : ce que c'est et pourquoi ça arrive, 1-2 phrases>"
    }
  ]
}

Règles :
- Fournis EXACTEMENT une entrée pour chacune des 7 catégories, dans l'ordre.
- Reste cosmétique : ne mentionne aucune maladie, cancer, ni condition médicale.
- Sois bienveillant et non anxiogène.
- Si la photo ne permet pas de juger un critère, mets score 70, severity "low", explication neutre.`;

function severityFromScore(score: number): Severity {
  if (score >= 80) return "none";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  return "high";
}

/** Nettoie et valide la sortie du modèle en un ScanAnalysis sûr. */
export function normalizeAnalysis(raw: unknown): ScanAnalysis {
  const obj = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  const rawMetrics = Array.isArray(obj.metrics) ? obj.metrics : [];

  const byCategory = new Map<string, Record<string, unknown>>();
  for (const m of rawMetrics) {
    if (m && typeof m === "object" && typeof (m as any).category === "string") {
      byCategory.set((m as any).category, m as Record<string, unknown>);
    }
  }

  const metrics: ScanMetricResult[] = METRIC_CATEGORIES.map((category) => {
    const m = byCategory.get(category) ?? {};
    let score = Number(m.score);
    if (!Number.isFinite(score)) score = 70;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const severity =
      typeof m.severity === "string" &&
      ["none", "low", "medium", "high"].includes(m.severity as string)
        ? (m.severity as Severity)
        : severityFromScore(score);
    return {
      category,
      score,
      severity,
      zone: typeof m.zone === "string" ? (m.zone as string) : "global",
      explanation:
        typeof m.explanation === "string" ? (m.explanation as string) : "",
    };
  });

  let overall = Number(obj.overallScore);
  if (!Number.isFinite(overall)) {
    overall = Math.round(
      metrics.reduce((s, m) => s + m.score, 0) / metrics.length,
    );
  }
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  return {
    overallScore: overall,
    summary:
      typeof obj.summary === "string" && obj.summary
        ? (obj.summary as string)
        : "Analyse cosmétique de votre peau.",
    metrics,
  };
}

/** Extrait le premier bloc JSON d'une réponse texte, tolérant aux \`\`\`json. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Réponse IA sans JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function toInlineData(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error("Image invalide (attendu data URL base64)");
  const [, mimeType, data] = match;
  return { inlineData: { mimeType, data } };
}

/**
 * Envoie une ou plusieurs photos (face, profil gauche, profil droit) à Gemini
 * et renvoie une analyse normalisée. Lève une erreur en cas d'échec.
 */
// Modèle par défaut à jour. Les modèles Gemini sont régulièrement retirés :
// on ignore une valeur d'env obsolète et on prévoit une chaîne de repli.
const DEFAULT_MODEL = "gemini-3.6-flash";
const DEPRECATED = /^(gemini-(1\.0|1\.5|2\.0)|gemini-pro\b|text-)/i;

function modelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const primary = !configured || DEPRECATED.test(configured) ? DEFAULT_MODEL : configured;
  // Déduplique en gardant l'ordre : configuré → défaut → alias "latest".
  return [...new Set([primary, DEFAULT_MODEL, "gemini-flash-latest"])];
}

export async function analyzeSkin(images: string | string[]): Promise<ScanAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquant");

  const list = (Array.isArray(images) ? images : [images]).filter(Boolean);
  if (list.length === 0) throw new Error("Aucune image fournie");

  const genAI = new GoogleGenerativeAI(apiKey);
  const angleNote =
    list.length > 1
      ? "\n\nPlusieurs photos du même visage sont fournies (face, puis profils gauche/droit). Analyse l'ensemble pour une évaluation plus complète."
      : "";
  const parts = [SYSTEM_PROMPT + angleNote, ...list.map(toInlineData)];

  let lastErr: unknown;
  for (const modelName of modelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      });
      const result = await model.generateContent(parts);
      return normalizeAnalysis(extractJson(result.response.text()));
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Modèle indisponible/retiré → on tente le suivant ; sinon on remonte.
      if (/not found|no longer available|not supported|404/i.test(msg)) continue;
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Analyse Gemini impossible");
}
