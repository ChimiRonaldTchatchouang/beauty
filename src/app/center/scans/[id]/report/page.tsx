import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, users, centers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ScanReport } from "@/components/center/ScanReport";

export default async function ScanReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");
  const { id } = await params;

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, id), eq(scans.centerId, session.centerId)))
    .limit(1);
  if (!scan || !scan.analysis) notFound();

  const [patient] = await db.select().from(users).where(eq(users.id, scan.patientId)).limit(1);
  const [center] = await db.select().from(centers).where(eq(centers.id, session.centerId)).limit(1);

  // Référence lisible + fiabilité par photo (si stockée).
  const d = scan.createdAt;
  const scanRef = `SCAN-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-${scan.id.slice(0, 4).toUpperCase()}`;
  const q = scan.quality as { photos?: { ok?: boolean; reason?: string }[] } | null;
  const photoQualities = Array.isArray(q?.photos) ? q!.photos : null;

  return (
    <ScanReport
      centerName={center?.name ?? "Centre"}
      centerLogo={center?.logoUrl ?? null}
      patientLabel={patient?.name ?? patient?.email ?? "Patient"}
      date={scan.createdAt.toISOString()}
      scanRef={scanRef}
      analysis={scan.analysis}
      routine={scan.routine ?? null}
      image={scan.imageData}
      images={scan.images ?? null}
      photoQualities={photoQualities}
    />
  );
}
