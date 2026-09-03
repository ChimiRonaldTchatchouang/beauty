import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, scans, appointments, scanMetrics } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { getLicenseState } from "@/lib/license";
import { LicenseBanner } from "@/components/center/LicenseBanner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function CenterDashboard() {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");
  const centerId = session.centerId;

  const licenseState = await getLicenseState(centerId);

  const [[{ patientCount } = { patientCount: 0 }], upcoming, topConcerns] = await Promise.all([
    db
      .select({ patientCount: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.centerId, centerId), eq(users.role, "patient"))),
    db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        reason: appointments.reason,
        patientName: users.name,
        patientEmail: users.email,
      })
      .from(appointments)
      .innerJoin(users, eq(users.id, appointments.patientId))
      .where(and(eq(appointments.centerId, centerId), eq(appointments.status, "scheduled"), gte(appointments.scheduledAt, new Date())))
      .orderBy(asc(appointments.scheduledAt))
      .limit(5),
    db
      .select({ category: scanMetrics.category, avg: sql<number>`round(avg(${scanMetrics.score}))::int`, n: sql<number>`count(*)::int` })
      .from(scanMetrics)
      .innerJoin(scans, eq(scans.id, scanMetrics.scanId))
      .where(eq(scans.centerId, centerId))
      .groupBy(scanMetrics.category)
      .orderBy(sql`avg(${scanMetrics.score}) asc`)
      .limit(3),
  ]);

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>

      <LicenseBanner state={{ active: licenseState.active, reason: licenseState.reason, used: licenseState.used, quota: licenseState.quota, remaining: licenseState.remaining, expiresAt: licenseState.license?.expiresAt?.toISOString() ?? null }} />

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Patients" value={patientCount} href="/center/patients" />
        <Stat
          label="Scans ce mois"
          value={licenseState.quota === null ? `${licenseState.used}` : `${licenseState.used} / ${licenseState.quota}`}
        />
        <Stat label="RDV à venir" value={upcoming.length} href="/center/appointments" />
      </div>

      <div className="mt-6">
        <Button asChild size="lg">
          <Link href="/center/scan">+ Scanner un patient</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold">Prochains rendez-vous</h2>
          <Card className="overflow-hidden p-0">
            {upcoming.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Aucun rendez-vous planifié.</p>
            ) : (
              upcoming.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
                  <div>
                    <p className="font-medium">{a.patientName ?? a.patientEmail}</p>
                    <p className="text-xs text-ink-faint">{a.reason ?? "Consultation"}</p>
                  </div>
                  <Badge variant="neutral">
                    {new Date(a.scheduledAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">Problèmes les plus fréquents</h2>
          <Card className="overflow-hidden p-0">
            {topConcerns.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Pas encore de données de scan.</p>
            ) : (
              topConcerns.map((c) => (
                <div key={c.category} className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
                  <span className="font-medium">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                  <span className="text-sm text-ink-faint">score moyen {c.avg} · {c.n} mesures</span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  acne: "Acné / imperfections",
  dark_spots: "Taches pigmentaires",
  wrinkles: "Rides & ridules",
  pores: "Pores dilatés",
  redness: "Rougeurs",
  hydration: "Hydratation",
  evenness: "Uniformité du teint",
};

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <Card className="transition hover:shadow-soft">
      <p className="text-3xl font-bold text-brand-600">{value}</p>
      <p className="text-sm text-ink-faint">{label}</p>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
