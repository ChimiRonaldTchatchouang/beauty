import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { centers, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getLicenseState } from "@/lib/license";
import { LicenseControls } from "@/components/admin/LicenseControls";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import { DeleteCenterButton } from "@/components/admin/DeleteCenterButton";

export default async function CenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [center] = await db.select().from(centers).where(eq(centers.id, id)).limit(1);
  if (!center) notFound();

  const licenseState = await getLicenseState(id);
  const staff = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, activated: users.activated })
    .from(users)
    .where(and(eq(users.centerId, id), sql`${users.role} in ('center_admin','staff')`));
  const [{ patientCount } = { patientCount: 0 }] = await db
    .select({ patientCount: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.centerId, id), eq(users.role, "patient")));

  return (
    <div className="animate-fade-in">
      <Link href="/admin/centers" className="text-sm font-medium text-ink-soft">
        ← Centres
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{center.name}</h1>
          <p className="text-ink-faint">
            {center.city ?? "—"} · {center.contactEmail}
          </p>
        </div>
        <DeleteCenterButton centerId={center.id} centerName={center.name} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Patients" value={patientCount} />
        <Stat label="Scans / mois" value={`${licenseState.used}${licenseState.quota === null ? "" : ` / ${licenseState.quota}`}`} />
        <Stat
          label="Licence"
          value={licenseState.license?.plan ?? "aucune"}
          tone={licenseState.active ? "ok" : "warn"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold">Licence</h2>
          <LicenseControls
            centerId={center.id}
            centerActive={center.active}
            license={
              licenseState.license
                ? {
                    id: licenseState.license.id,
                    plan: licenseState.license.plan,
                    status: licenseState.license.status,
                    expiresAt: licenseState.license.expiresAt?.toISOString() ?? null,
                  }
                : null
            }
            reason={licenseState.reason}
          />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">Comptes du centre</h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
            {staff.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Aucun compte staff.</p>
            ) : (
              staff.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 border-b border-sand-100 px-4 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name ?? u.email}</p>
                    <p className="truncate text-xs text-ink-faint">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right text-xs">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
                        {u.role === "center_admin" ? "Gérant" : "Staff"}
                      </span>
                      <p className="mt-1 text-ink-faint">{u.activated ? "actif" : "invité"}</p>
                    </div>
                    <ResetPasswordButton userId={u.id} label={u.email} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "ok" | "warn" }) {
  return (
    <div className="card">
      <p className={`text-2xl font-bold ${tone === "warn" ? "text-amber-600" : "text-brand-600"}`}>{value}</p>
      <p className="text-sm text-ink-faint">{label}</p>
    </div>
  );
}
