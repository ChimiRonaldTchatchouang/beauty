import { db } from "@/lib/db";
import { scans, users, centers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyShareToken } from "@/lib/share";
import { generateReportPdf } from "@/lib/pdf";

// Vrai fichier PDF du rapport, accessible via jeton signé (WhatsApp/email/download).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const scanId = verifyShareToken(decodeURIComponent(token));
  if (!scanId) return new Response("Lien invalide", { status: 404 });

  const [scan] = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (!scan || !scan.analysis) return new Response("Rapport introuvable", { status: 404 });

  const [patient] = await db.select().from(users).where(eq(users.id, scan.patientId)).limit(1);
  const [center] = scan.centerId
    ? await db.select().from(centers).where(eq(centers.id, scan.centerId)).limit(1)
    : [];

  const d = scan.createdAt;
  const scanRef = `SCAN-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${scan.id.slice(0, 4).toUpperCase()}`;

  const pdf = await generateReportPdf({
    center: {
      name: center?.name ?? "SkinScan",
      city: center?.city,
      contactEmail: center?.contactEmail,
      contactPhone: center?.contactPhone,
    },
    patientLabel: patient?.name ?? "Patient",
    scanRef,
    date: scan.createdAt.toISOString(),
    analysis: scan.analysis,
    routine: scan.routine ?? null,
    image: scan.imageData,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rapport-${scanRef}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
