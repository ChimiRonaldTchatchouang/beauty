import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, skinProfiles, scans, scanMetrics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { analyzeSkin } from "@/lib/gemini";
import { generateRoutine } from "@/lib/routine";
import { getMonthlyUsage } from "@/lib/quota";

// Route d'analyse : reçoit l'image compressée (data URL) + métadonnées qualité,
// appelle Gemini, stocke le scan + les métriques + la routine générée.
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  // Le consentement est obligatoire (donnée sensible).
  if (!user.consentAt) {
    return NextResponse.json(
      { error: "consent_required" },
      { status: 403 },
    );
  }

  // Vérification du quota freemium avant tout appel API (économie de coûts).
  const usage = await getMonthlyUsage(user.id, user.plan);
  if (usage.remaining !== null && usage.remaining <= 0) {
    return NextResponse.json({ error: "quota_reached" }, { status: 402 });
  }

  const { image, thumbnail, quality } = await req.json();
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante." }, { status: 400 });
  }

  // Garde-fou serveur : on refuse une image dont le contrôle qualité a échoué
  // (le client bloque déjà, mais on ne fait JAMAIS d'appel Gemini pour rien).
  if (quality && quality.ok === false) {
    return NextResponse.json({ error: "quality_failed" }, { status: 422 });
  }

  // Création du scan en état "pending".
  const [scan] = await db
    .insert(scans)
    .values({
      userId: user.id,
      imageData: image,
      thumbnailData: typeof thumbnail === "string" ? thumbnail : null,
      quality: quality ?? null,
      status: "pending",
    })
    .returning({ id: scans.id });

  try {
    const analysis = await analyzeSkin(image);

    const [profile] = await db
      .select()
      .from(skinProfiles)
      .where(eq(skinProfiles.userId, user.id))
      .limit(1);

    const routine = generateRoutine(analysis, profile ?? null);

    await db
      .update(scans)
      .set({
        status: "analyzed",
        overallScore: analysis.overallScore,
        analysis,
        routine,
      })
      .where(eq(scans.id, scan.id));

    // Détail par critère (table dédiée pour requêtes/agrégations Pro).
    await db.insert(scanMetrics).values(
      analysis.metrics.map((m) => ({
        scanId: scan.id,
        category: m.category,
        score: m.score,
        severity: m.severity,
        zone: m.zone,
        explanation: m.explanation,
      })),
    );

    return NextResponse.json({ id: scan.id, analysis, routine });
  } catch (err) {
    console.error("[scan] analyse échouée", err);
    await db
      .update(scans)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "unknown",
      })
      .where(eq(scans.id, scan.id));
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
