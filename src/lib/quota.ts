import "server-only";
import { db } from "./db";
import { scans } from "./db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export function freeScansPerMonth(): number {
  const n = Number(process.env.FREE_SCANS_PER_MONTH);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/** Renvoie l'usage du mois courant pour un utilisateur. */
export async function getMonthlyUsage(
  userId: string,
  plan: "free" | "premium",
): Promise<{ used: number; limit: number | null; remaining: number | null }> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scans)
    .where(
      and(
        eq(scans.userId, userId),
        gte(scans.createdAt, startOfMonth),
        // On ne compte pas les scans en échec dans le quota.
        sql`${scans.status} <> 'failed'`,
      ),
    );

  const used = rows[0]?.count ?? 0;
  if (plan === "premium") {
    return { used, limit: null, remaining: null };
  }
  const limit = freeScansPerMonth();
  return { used, limit, remaining: Math.max(0, limit - used) };
}
