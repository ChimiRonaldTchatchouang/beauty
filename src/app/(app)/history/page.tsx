import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { HistoryView } from "@/components/views/HistoryView";

export default async function HistoryPage() {
  const user = (await getCurrentUser())!;
  const rows = await db
    .select({
      id: scans.id,
      overallScore: scans.overallScore,
      thumbnailData: scans.thumbnailData,
      analysis: scans.analysis,
      createdAt: scans.createdAt,
    })
    .from(scans)
    .where(and(eq(scans.userId, user.id), eq(scans.status, "analyzed")))
    .orderBy(asc(scans.createdAt));

  return <HistoryView scans={rows} />;
}
