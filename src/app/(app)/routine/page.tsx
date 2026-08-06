import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { RoutineView } from "@/components/views/RoutineView";

export default async function RoutinePage() {
  const user = (await getCurrentUser())!;
  const [last] = await db
    .select({ routine: scans.routine, createdAt: scans.createdAt })
    .from(scans)
    .where(and(eq(scans.userId, user.id), eq(scans.status, "analyzed")))
    .orderBy(desc(scans.createdAt))
    .limit(1);

  return <RoutineView routine={last?.routine ?? null} />;
}
