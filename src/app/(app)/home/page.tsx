import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getMonthlyUsage } from "@/lib/quota";
import { HomeView } from "@/components/views/HomeView";

export default async function HomePage() {
  const user = (await getCurrentUser())!;

  const [lastScan] = await db
    .select({
      id: scans.id,
      overallScore: scans.overallScore,
      thumbnailData: scans.thumbnailData,
      createdAt: scans.createdAt,
    })
    .from(scans)
    .where(and(eq(scans.userId, user.id), eq(scans.status, "analyzed")))
    .orderBy(desc(scans.createdAt))
    .limit(1);

  const usage = await getMonthlyUsage(user.id, user.plan);

  return (
    <HomeView
      name={user.name}
      plan={user.plan}
      usage={usage}
      lastScan={lastScan ?? null}
    />
  );
}
