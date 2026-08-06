import "server-only";
import { db } from "./db";
import { licenses, scans } from "./db/schema";
import { and, desc, eq, gte, sql, ne } from "drizzle-orm";

export interface LicenseState {
  license: typeof licenses.$inferSelect | null;
  active: boolean; // licence utilisable maintenant
  reason: "ok" | "none" | "suspended" | "expired";
  used: number; // scans ce mois (centre)
  quota: number | null; // null = illimité
  remaining: number | null;
}

function startOfMonthUTC(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** État de licence + consommation de scans du mois pour un centre. */
export async function getLicenseState(centerId: string): Promise<LicenseState> {
  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.centerId, centerId))
    .orderBy(desc(licenses.createdAt))
    .limit(1);

  const [{ used } = { used: 0 }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(scans)
    .where(
      and(
        eq(scans.centerId, centerId),
        gte(scans.createdAt, startOfMonthUTC()),
        ne(scans.status, "failed"),
      ),
    );

  if (!license) {
    return { license: null, active: false, reason: "none", used, quota: 0, remaining: 0 };
  }

  const expired = license.expiresAt ? license.expiresAt.getTime() < Date.now() : false;
  if (license.status === "suspended") {
    return { license, active: false, reason: "suspended", used, quota: license.monthlyScanQuota, remaining: 0 };
  }
  if (license.status === "expired" || expired) {
    return { license, active: false, reason: "expired", used, quota: license.monthlyScanQuota, remaining: 0 };
  }

  const quota = license.monthlyScanQuota;
  const remaining = quota === null ? null : Math.max(0, quota - used);
  return { license, active: true, reason: "ok", used, quota, remaining };
}

/** Peut-on lancer un scan maintenant ? */
export function canScan(state: LicenseState): boolean {
  return state.active && (state.remaining === null || state.remaining > 0);
}
