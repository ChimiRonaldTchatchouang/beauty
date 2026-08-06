import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, scanMetrics, scans, partners } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Espace Partenaire Pro — Phase 2.
// Scaffold minimal role-gated : la structure (routes, requêtes agrégées, tables)
// est posée dès la v1 pour éviter une refonte. Non destiné aux utilisateurs finaux.
// -----------------------------------------------------------------------------

export default async function ProDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "pro" && user.role !== "admin") redirect("/home");

  // Nombre de clients rattachés au partenaire.
  const [{ clientCount } = { clientCount: 0 }] = user.partnerId
    ? await db
        .select({ clientCount: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.partnerId, user.partnerId))
    : [{ clientCount: 0 }];

  // Problèmes les plus fréquents (agrégé sur les scans des clients du partenaire).
  const topConcerns = user.partnerId
    ? await db
        .select({
          category: scanMetrics.category,
          avgScore: sql<number>`round(avg(${scanMetrics.score}))::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(scanMetrics)
        .innerJoin(scans, eq(scans.id, scanMetrics.scanId))
        .innerJoin(users, eq(users.id, scans.userId))
        .where(eq(users.partnerId, user.partnerId))
        .groupBy(scanMetrics.category)
        .orderBy(sql`avg(${scanMetrics.score}) asc`)
        .limit(5)
    : [];

  const [partner] = user.partnerId
    ? await db.select().from(partners).where(eq(partners.id, user.partnerId)).limit(1)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
        Espace Partenaire Pro · Phase 2 (aperçu)
      </div>
      <h1 className="text-2xl font-bold">{partner?.name ?? "Tableau de bord"}</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Clients" value={clientCount} />
        <Stat label="Crédits de scans" value={partner?.scanCredits ?? 0} />
        <Stat label="Problèmes suivis" value={topConcerns.length} />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Problèmes les plus fréquents</h2>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
        {topConcerns.length === 0 ? (
          <p className="p-6 text-sm text-ink-soft">
            Aucune donnée agrégée pour le moment. Les statistiques apparaîtront
            dès que vos clients auront réalisé des scans.
          </p>
        ) : (
          topConcerns.map((c) => (
            <div
              key={c.category}
              className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0"
            >
              <span className="font-medium">{c.category}</span>
              <span className="text-sm text-ink-faint">
                score moyen {c.avgScore} · {c.count} mesures
              </span>
            </div>
          ))
        )}
      </div>

      <p className="mt-8 text-sm text-ink-faint">
        Modules à venir : liste clients &amp; fiches, gestion du catalogue produits,
        facturation / recharge de crédits via Mobile Money.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-3xl font-bold text-brand-600">{value}</p>
      <p className="text-sm text-ink-faint">{label}</p>
    </div>
  );
}
