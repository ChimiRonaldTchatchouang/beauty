import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, users, centers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { CenterScanDetail } from "@/components/center/CenterScanDetail";
import { reportPdfUrl } from "@/lib/share";
import { whatsappConfigured } from "@/lib/whatsapp";

export default async function CenterScanPage({
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

  return (
    <div>
      <Link href={`/center/patients/${scan.patientId}`} className="text-sm font-medium text-ink-soft">
        ← Fiche patient
      </Link>
      <CenterScanDetail
        scanId={scan.id}
        patientLabel={patient?.name ?? patient?.email ?? "Patient"}
        patientPhone={patient?.phone ?? null}
        centerName={center?.name ?? "votre centre"}
        reportUrl={reportPdfUrl(scan.id)}
        whatsappAuto={whatsappConfigured()}
        analysis={scan.analysis}
        routine={scan.routine ?? null}
        image={scan.imageData}
        images={scan.images ?? null}
        emailed={Boolean(scan.emailedAt)}
        date={scan.createdAt.toISOString()}
      />
    </div>
  );
}
