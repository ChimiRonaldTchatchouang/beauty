import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ScanAnalysis, ScanMetricResult, ScanPriority, Severity } from "./db/schema";
import { ALLOWED_CATEGORIES } from "./categories";

const SYSTEM_PROMPT = `Tu es un expert en analyse cosmétique de la peau (esthétique uniquement, JAMAIS de diagnostic médical ou pathologique).
On te fournit une ou plusieurs photos d'un visage, et parfois un court questionnaire décrivant la personne. Analyse UNIQUEMENT des aspects cosmétiques visibles, et adapte l'analyse au questionnaire (ex. n'évalue "irritation liée au rasage" que si la personne se rase).

Tu dois répondre STRICTEMENT en JSON valide (aucun texte hors JSON, pas de markdown, pas de \`\`\`), au format exact :
{
  "overallScore": <entier 0-100, 100 = peau visiblement en très bonne santé>,
  "skinType": "<type de peau estimé, ex: 'Mixte à tendance grasse', 'Sèche', 'Normale'>",
  "summary": "<2-3 phrases bienveillantes en français: état général + axes d'amélioration>",
  "priorities": [
    { "title": "<axe prioritaire n°1>", "why": "<pourquoi c'est prioritaire, avec le lien de cause à effet, 1-2 phrases>" }
  ],
  "metrics": [
    {
      "category": <un de: ${ALLOWED_CATEGORIES.map((c) => `"${c}"`).join(", ")}>,
      "score": <entier 0-100, 100 = parfait sur ce critère>,
      "severity": "none" | "low" | "medium" | "high",
      "zone": "<zones concernées en français, ex: 'Joues, ligne de barbe, cou'>",
      "explanation": "<observation précise et pédagogique, 1-2 phrases>"
    }
  ]
}

Règles :
- "priorities" : les 3 axes les plus importants, classés (le plus impactant d'abord), avec le raisonnement (ex. l'irritation du rasage entretient les taches sombres).
- "metrics" : SEULEMENT les critères PERTINENTS pour cette personne (entre 5 et 10). N'inclus "shaving_irritation" que si la personne se rase ; "lip_hydration" et "dark_circles" si visibles/pertinents.
- Reste cosmétique : aucune maladie, aucun cancer, aucune condition médicale.
- Bienveillant, non anxiogène, adapté aux peaux de toutes carnations.`;

function severityFromScore(score: number): Severity {
  if (score >= 80) return "none";
  if (score >= 60) return "low";
  if (score >= 40) return "medium";
  return "high";
}

/** Nettoie et valide la sortie du modèle en un ScanAnalysis sûr (critères dynamiques). */
export function normalizeAnalysis(raw: unknown): ScanAnalysis {
  const obj = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
  const rawMetrics = Array.isArray(obj.metrics) ? obj.metrics : [];

  const seen = new Set<string>();
  const metrics: ScanMetricResult[] = [];
  for (const item of rawMetrics) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const category = typeof m.category === "string" ? m.category : "";
    if (!ALLOWED_CATEGORIES.includes(category) || seen.has(category)) continue;
    seen.add(category);
    let score = Number(m.score);
    if (!Number.isFinite(score)) score = 70;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const severity =
      typeof m.severity === "string" && ["none", "low", "medium", "high"].includes(m.severity)
        ? (m.severity as Severity)
        : severityFromScore(score);
    metrics.push({
      category,
      score,
      severity,
      zone: typeof m.zone === "string" ? m.zone : "Visage",
      explanation: typeof m.explanation === "string" ? m.explanation : "",
    });
  }

  // Repli si l'IA n'a rien renvoyé d'exploitable.
  if (metrics.length === 0) {
    for (const category of ["hydration", "evenness", "pores", "acne", "dark_spots"]) {
      metrics.push({ category, score: 70, severity: "low", zone: "Visage", explanation: "" });
    }
  }

  let overall = Number(obj.overallScore);
  if (!Number.isFinite(overall)) {
    overall = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  }
  overall = Math.max(0, Math.min(100, Math.round(overall)));

  const priorities: ScanPriority[] = Array.isArray(obj.priorities)
    ? (obj.priorities as unknown[])
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
        .slice(0, 3)
        .map((p) => ({
          title: typeof p.title === "string" ? p.title : "",
          why: typeof p.why === "string" ? p.why : "",
        }))
        .filter((p) => p.title)
    : [];

  return {
    overallScore: overall,
    skinType: typeof obj.skinType === "string" ? obj.skinType : undefined,
    summary:
      typeof obj.summary === "string" && obj.summary ? obj.summary : "Analyse cosmétique de votre peau.",
    priorities,
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

/** Test de connexion IA (léger) : renvoie le modèle qui répond, ou l'erreur. */
export async function pingGemini(): Promise<{ ok: boolean; model?: string; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY manquant" };
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastErr = "";
  for (const modelName of modelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 1000, responseMimeType: "application/json" },
      });
      await model.generateContent('Réponds en JSON: {"ok":true}');
      return { ok: true, model: modelName };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (/not found|no longer available|not supported|404/i.test(lastErr)) continue;
      break;
    }
  }
  return { ok: false, error: lastErr };
}

function intakeToText(intake?: Record<string, unknown> | null): string {
  if (!intake || typeof intake !== "object") return "";
  const lines: string[] = [];
  const L: Record<string, string> = {
    shaves: "Se rase le visage",
    shaveFreq: "Fréquence de rasage",
    perceivedSkin: "Peau ressentie",
    sunExposure: "Exposition solaire fréquente",
    usesSpf: "Utilise une protection solaire",
    dryLips: "Lèvres souvent sèches",
    tiredEyes: "Cernes / fatigue fréquents",
    allergies: "Allergies / à éviter",
    goal: "Objectif principal",
    concerns: "Préoccupations déclarées",
  };
  for (const [k, label] of Object.entries(L)) {
    const v = (intake as Record<string, unknown>)[k];
    if (v === undefined || v === null || v === "") continue;
    lines.push(`- ${label} : ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  }
  return lines.length ? `\n\nQUESTIONNAIRE DE LA PERSONNE :\n${lines.join("\n")}` : "";
}

export async function analyzeSkin(
  images: string | string[],
  intake?: Record<string, unknown> | null,
): Promise<ScanAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquant");

  const list = (Array.isArray(images) ? images : [images]).filter(Boolean);
  if (list.length === 0) throw new Error("Aucune image fournie");

  const genAI = new GoogleGenerativeAI(apiKey);
  const angleNote =
    list.length > 1
      ? "\n\nPlusieurs photos du même visage sont fournies (face, puis profils gauche/droit). Analyse l'ensemble."
      : "";
  const parts = [SYSTEM_PROMPT + angleNote + intakeToText(intake), ...list.map(toInlineData)];

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
