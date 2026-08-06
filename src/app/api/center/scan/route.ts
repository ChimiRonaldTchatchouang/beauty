import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, skinProfiles, scans, scanMetrics } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { analyzeSkin } from "@/lib/gemini";
import { generateRoutine } from "@/lib/routine";
import { getLicenseState, canScan } from "@/lib/license";

export const maxDuration = 60;

// Scan réalisé par un centre pour l'un de ses patients.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "center_admin" && session.role !== "staff")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const centerId = session.centerId;
  if (!centerId) {
    return NextResponse.json({ error: "no_center" }, { status: 400 });
  }

  // Licence active + quota disponible (jamais d'appel Gemini sinon).
  const licenseState = await getLicenseState(centerId);
  if (!canScan(licenseState)) {
    return NextResponse.json(
      { error: "license", reason: licenseState.reason, remaining: licenseState.remaining },
      { status: 402 },
    );
  }

  const { patientId, image, thumbnail, quality } = await req.json();
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image manquante." }, { status: 400 });
  }
  if (!patientId) {
    return NextResponse.json({ error: "Patient manquant." }, { status: 400 });
  }

  // Le patient doit appartenir à ce centre.
  const [patient] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, patientId), eq(users.centerId, centerId)))
    .limit(1);
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable." }, { status: 404 });
  }

  // Garde-fou qualité serveur.
  if (quality && quality.ok === false) {
    return NextResponse.json({ error: "quality_failed" }, { status: 422 });
  }

  const [scan] = await db
    .insert(scans)
    .values({
      centerId,
      patientId,
      staffId: session.userId,
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
      .where(eq(skinProfiles.userId, patientId))
      .limit(1);
    const routine = generateRoutine(analysis, profile ?? null);

    await db
      .update(scans)
      .set({ status: "analyzed", overallScore: analysis.overallScore, analysis, routine })
      .where(eq(scans.id, scan.id));

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
    console.error("[center/scan]", err);
    await db
      .update(scans)
      .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "unknown" })
      .where(eq(scans.id, scan.id));
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
