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

/**
 * Envoie l'image (data URL base64) à Gemini et renvoie une analyse normalisée.
 * Lève une erreur en cas d'échec (clé manquante, réseau, JSON invalide).
 */
export async function analyzeSkin(imageDataUrl: string): Promise<ScanAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquant");

  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) throw new Error("Image invalide (attendu data URL base64)");
  const [, mimeType, base64] = match;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });

  const result = await model.generateContent([
    SYSTEM_PROMPT,
    { inlineData: { mimeType, data: base64 } },
  ]);

  const text = result.response.text();
  const parsed = extractJson(text);
  return normalizeAnalysis(parsed);
}
