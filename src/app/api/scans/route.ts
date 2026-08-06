import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Liste des scans de l'utilisateur (vignettes + score + date).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const rows = await db
    .select({
      id: scans.id,
      overallScore: scans.overallScore,
      thumbnailData: scans.thumbnailData,
      status: scans.status,
      analysis: scans.analysis,
      createdAt: scans.createdAt,
    })
    .from(scans)
    .where(and(eq(scans.userId, session.userId), eq(scans.status, "analyzed")))
    .orderBy(desc(scans.createdAt));

  return NextResponse.json({ scans: rows });
}
