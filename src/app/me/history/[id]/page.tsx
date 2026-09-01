import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ResultsView } from "@/components/views/ResultsView";
import { ScanActions } from "@/components/views/ScanActions";

export default async function MeScanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getCurrentUser())!;
  const { id } = await params;

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, id), eq(scans.patientId, user.id)))
    .limit(1);
  if (!scan || !scan.analysis) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/me/history" className="text-sm font-medium text-ink-soft">
          ← Historique
        </Link>
        <ScanActions scanId={scan.id} />
      </div>
      <ResultsView analysis={scan.analysis} image={scan.imageData} images={scan.images} showRoutineCta={false} date={scan.createdAt} />
    </div>
  );
}
