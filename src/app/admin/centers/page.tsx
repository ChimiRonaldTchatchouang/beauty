import Link from "next/link";
import { db } from "@/lib/db";
import { centers, licenses, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { CreateCenterForm } from "@/components/admin/CreateCenterForm";

export default async function CentersPage() {
  const rows = await db
    .select({
      id: centers.id,
      name: centers.name,
      city: centers.city,
      active: centers.active,
      plan: licenses.plan,
      status: licenses.status,
      expiresAt: licenses.expiresAt,
      staffCount: sql<number>`(select count(*)::int from ${users} u where u.center_id = ${centers.id} and u.role in ('center_admin','staff'))`,
    })
    .from(centers)
    .leftJoin(licenses, eq(licenses.centerId, centers.id))
    .orderBy(desc(centers.createdAt));

  // Un centre peut avoir plusieurs licences (historique) : on garde la + récente.
  const seen = new Set<string>();
  const uniqueCenters = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Centres</h1>
        <CreateCenterForm />
      </div>

      {uniqueCenters.length === 0 ? (
        <div className="card text-center">
          <div className="mb-2 text-4xl">🏥</div>
          <p className="font-semibold">Aucun centre pour le moment</p>
          <p className="mt-1 text-sm text-ink-soft">Créez votre premier centre client ci-dessus.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
          {uniqueCenters.map((c) => (
            <Link
              key={c.id}
              href={`/admin/centers/${c.id}`}
              className="flex items-center gap-4 border-b border-sand-100 px-4 py-3 last:border-0 hover:bg-sand-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-sm text-ink-faint">
                  {c.city ?? "—"} · {c.staffCount} compte(s)
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.status === "active" && c.active
                      ? "bg-green-100 text-green-700"
                      : "bg-sand-100 text-ink-faint"
                  }`}
                >
                  {c.plan ?? "sans licence"}
                </span>
                <p className="mt-1 text-xs text-ink-faint">
                  {c.expiresAt ? `exp. ${new Date(c.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
