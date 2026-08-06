import { redirect } from "next/navigation";
import { getSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { centers, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getLicenseState } from "@/lib/license";

export default async function CenterSettingsPage() {
  const session = await getSession();
  const me = await getCurrentUser();
  if (!session?.centerId || !me) redirect("/login");

  const [center] = await db.select().from(centers).where(eq(centers.id, session.centerId)).limit(1);
  const licenseState = await getLicenseState(session.centerId);
  const staff = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, activated: users.activated })
    .from(users)
    .where(and(eq(users.centerId, session.centerId), sql`${users.role} in ('center_admin','staff')`));

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Réglages</h1>

      <Section title="Centre">
        <Row label="Nom" value={center?.name} />
        <Row label="Ville" value={center?.city} />
        <Row label="Email de contact" value={center?.contactEmail} />
        <Row label="Téléphone" value={center?.contactPhone} />
      </Section>

      <Section title="Licence">
        <Row label="Formule" value={licenseState.license?.plan ?? "aucune"} />
        <Row
          label="Statut"
          value={licenseState.active ? "Active" : licenseState.reason === "expired" ? "Expirée" : licenseState.reason === "suspended" ? "Suspendue" : "Aucune"}
        />
        <Row
          label="Scans ce mois"
          value={licenseState.quota === null ? `${licenseState.used} (illimité)` : `${licenseState.used} / ${licenseState.quota}`}
        />
        <Row
          label="Expiration"
          value={licenseState.license?.expiresAt ? new Date(licenseState.license.expiresAt).toLocaleDateString("fr-FR") : "—"}
        />
        <div className="px-4 py-3 text-xs text-ink-faint">
          Pour renouveler ou augmenter votre quota, contactez l'administrateur SkinScan.
        </div>
      </Section>

      <Section title="Équipe">
        {staff.map((u) => (
          <div key={u.id} className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
            <div>
              <p className="font-medium">{u.name ?? u.email}</p>
              <p className="text-xs text-ink-faint">{u.email}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {u.role === "center_admin" ? "Gérant" : "Staff"}
            </span>
          </div>
        ))}
        <div className="px-4 py-3 text-xs text-ink-faint">
          L'ajout de comptes staff sera disponible prochainement (limité par votre licence :
          {" "}{licenseState.license?.maxStaff ?? 0} compte(s)).
        </div>
      </Section>

      <p className="mt-6 text-center text-xs text-ink-faint">
        Connecté en tant que {me.email} · SkinScan pour centres de beauté.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">{title}</h2>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
