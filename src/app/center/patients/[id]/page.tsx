import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, skinProfiles, scans, appointments } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { scoreColor } from "@/lib/colors";
import { PatientProfileForm } from "@/components/center/PatientProfileForm";
import { PatientInfoForm } from "@/components/center/PatientInfoForm";
import { AppointmentForm } from "@/components/center/AppointmentForm";
import { AppointmentStatusButtons } from "@/components/center/AppointmentStatusButtons";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");
  const { id } = await params;

  const [patient] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.centerId, session.centerId), eq(users.role, "patient")))
    .limit(1);
  if (!patient) notFound();

  // Perf : les 3 requêtes en parallèle (au lieu de séquentiel) → page plus rapide.
  const [[profile], patientScans, patientAppointments] = await Promise.all([
    db.select().from(skinProfiles).where(eq(skinProfiles.userId, id)).limit(1),
    db
      .select({ id: scans.id, overallScore: scans.overallScore, createdAt: scans.createdAt, emailedAt: scans.emailedAt, thumb: scans.thumbnailData })
      .from(scans)
      .where(and(eq(scans.patientId, id), eq(scans.status, "analyzed")))
      .orderBy(desc(scans.createdAt)),
    db.select().from(appointments).where(eq(appointments.patientId, id)).orderBy(desc(appointments.scheduledAt)),
  ]);

  return (
    <div className="animate-fade-in">
      <Link href="/center/patients" className="text-sm font-medium text-ink-soft">
        ← Patients
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {(patient.name?.[0] ?? patient.email[0]).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{patient.name ?? "Patient"}</h1>
            <p className="text-sm text-ink-faint">
              {patient.email} · {patient.activated ? "compte actif" : "en attente de connexion"}
            </p>
          </div>
        </div>
        <Link href={`/center/scan?patient=${patient.id}`} className="btn-primary">
          + Scanner
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Historique des scans */}
        <div>
          <h2 className="mb-3 text-lg font-bold">Scans</h2>
          <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
            {patientScans.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Aucun scan pour ce patient.</p>
            ) : (
              patientScans.map((s) => (
                <Link
                  key={s.id}
                  href={`/center/scans/${s.id}`}
                  className="flex items-center gap-3 border-b border-sand-100 px-4 py-3 last:border-0 hover:bg-sand-50"
                >
                  {s.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumb} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-sand-100">🙂</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                    <p className="text-xs text-ink-faint">{s.emailedAt ? "✓ envoyé au patient" : "non envoyé"}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: scoreColor(s.overallScore ?? 0) }}>
                    {s.overallScore ?? "—"}
                  </span>
                </Link>
              ))
            )}
          </div>

          {/* Rendez-vous */}
          <h2 className="mb-3 mt-8 text-lg font-bold">Rendez-vous</h2>
          <AppointmentForm patientId={patient.id} />
          <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-soft">
            {patientAppointments.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Aucun rendez-vous.</p>
            ) : (
              patientAppointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 border-b border-sand-100 px-4 py-3 last:border-0">
                  <div>
                    <p className="font-medium">{new Date(a.scheduledAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-xs text-ink-faint">{a.reason ?? "Consultation"}</p>
                  </div>
                  <AppointmentStatusButtons id={a.id} status={a.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Infos patient + Profil peau éditables */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Informations</h2>
            <PatientInfoForm patientId={patient.id} name={patient.name} email={patient.email} phone={patient.phone} />
          </div>

          <h2 className="mb-3 mt-6 text-lg font-bold">Profil peau</h2>
          <PatientProfileForm
            patientId={patient.id}
            profile={{
              skinType: profile?.skinType ?? "",
              ageRange: profile?.ageRange ?? "",
              concerns: (profile?.concerns ?? []).join(", "),
              allergies: profile?.allergies ?? "",
              notes: profile?.notes ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
