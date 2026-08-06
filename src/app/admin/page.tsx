import Link from "next/link";
import { db } from "@/lib/db";
import { centers, users, scans, licenses } from "@/lib/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

function startOfMonthUTC(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboard() {
  const [[{ centerCount } = { centerCount: 0 }], [{ patientCount } = { patientCount: 0 }], [{ scanCount } = { scanCount: 0 }]] =
    await Promise.all([
      db.select({ centerCount: sql<number>`count(*)::int` }).from(centers),
      db.select({ patientCount: sql<number>`count(*)::int` }).from(users).where(eq(users.role, "patient")),
      db
        .select({ scanCount: sql<number>`count(*)::int` })
        .from(scans)
        .where(and(gte(scans.createdAt, startOfMonthUTC()), eq(scans.status, "analyzed"))),
    ]);

  // Licences qui expirent dans les 14 jours.
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const expiring = await db
    .select({
      centerId: licenses.centerId,
      centerName: centers.name,
      plan: licenses.plan,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
    })
    .from(licenses)
    .innerJoin(centers, eq(centers.id, licenses.centerId))
    .where(and(eq(licenses.status, "active"), sql`${licenses.expiresAt} < ${soon.toISOString()}`))
    .orderBy(licenses.expiresAt)
    .limit(10);

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Centres" value={centerCount} href="/admin/centers" />
        <Stat label="Patients" value={patientCount} />
        <Stat label="Scans ce mois" value={scanCount} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">⏳ Licences à renouveler</h2>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
        {expiring.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft">Aucune licence n'expire dans les 14 jours.</p>
        ) : (
          expiring.map((l) => (
            <Link
              key={l.centerId}
              href={`/admin/centers/${l.centerId}`}
              className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0 hover:bg-sand-50"
            >
              <span className="font-medium">{l.centerName}</span>
              <span className="text-sm text-ink-faint">
                {l.plan} · expire le{" "}
                {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString("fr-FR") : "—"}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="card">
      <p className="text-3xl font-bold text-brand-600">{value}</p>
      <p className="text-sm text-ink-faint">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
