import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, scans } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { CreatePatientForm } from "@/components/center/CreatePatientForm";

export default async function PatientsPage() {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");

  const patients = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      activated: users.activated,
      createdAt: users.createdAt,
      scanCount: sql<number>`(select count(*)::int from ${scans} s where s.patient_id = ${users.id})`,
      lastScore: sql<number | null>`(select s.overall_score from ${scans} s where s.patient_id = ${users.id} and s.status='analyzed' order by s.created_at desc limit 1)`,
    })
    .from(users)
    .where(and(eq(users.centerId, session.centerId), eq(users.role, "patient")))
    .orderBy(desc(users.createdAt));

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Patients</h1>
        <CreatePatientForm />
      </div>

      {patients.length === 0 ? (
        <div className="card text-center">
          <div className="mb-2 text-4xl">🧑‍🤝‍🧑</div>
          <p className="font-semibold">Aucun patient enregistré</p>
          <p className="mt-1 text-sm text-ink-soft">Ajoutez un patient pour lancer un premier scan.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
          {patients.map((p) => (
            <Link
              key={p.id}
              href={`/center/patients/${p.id}`}
              className="flex items-center gap-4 border-b border-sand-100 px-4 py-3 last:border-0 hover:bg-sand-50"
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">
                {(p.name?.[0] ?? p.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name ?? p.email}</p>
                <p className="truncate text-xs text-ink-faint">
                  {p.scanCount} scan(s) · {p.activated ? "compte actif" : "en attente de 1re connexion"}
                </p>
              </div>
              {p.lastScore != null && (
                <span className="rounded-full bg-sand-100 px-2.5 py-1 text-sm font-bold text-ink">
                  {p.lastScore}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
