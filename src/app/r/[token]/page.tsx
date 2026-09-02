import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { scans, users, centers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyShareToken } from "@/lib/share";
import { ScanReport } from "@/components/center/ScanReport";

// Rapport public (lien partagé, ex. WhatsApp) — jeton signé, sans connexion.
export const dynamic = "force-dynamic";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const scanId = verifyShareToken(decodeURIComponent(token));
  if (!scanId) notFound();

  const [scan] = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (!scan || !scan.analysis) notFound();

  const [patient] = await db.select().from(users).where(eq(users.id, scan.patientId)).limit(1);
  const [center] = scan.centerId
    ? await db.select().from(centers).where(eq(centers.id, scan.centerId)).limit(1)
    : [];

  const d = scan.createdAt;
  const scanRef = `SCAN-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${scan.id.slice(0, 4).toUpperCase()}`;
  const q = scan.quality as { photos?: { ok?: boolean; reason?: string }[] } | null;
  const photoQualities = Array.isArray(q?.photos) ? q!.photos : null;

  return (
    <div className="min-h-dvh bg-sand-50 px-4 py-6">
      <ScanReport
        centerName={center?.name ?? "SkinScan"}
        centerLogo={center?.logoUrl ?? null}
        patientLabel={patient?.name ?? "Patient"}
        date={scan.createdAt.toISOString()}
        scanRef={scanRef}
        analysis={scan.analysis}
        routine={scan.routine ?? null}
        image={scan.imageData}
        images={scan.images ?? null}
        photoQualities={photoQualities}
        backHref={null}
      />
    </div>
  );
}
