import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, users } from "@/lib/db/schema";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { AppointmentStatusButtons } from "@/components/center/AppointmentStatusButtons";

export default async function AppointmentsPage() {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");

  const now = new Date();
  const rows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      reason: appointments.reason,
      patientId: appointments.patientId,
      patientName: users.name,
      patientEmail: users.email,
    })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.patientId))
    .where(eq(appointments.centerId, session.centerId))
    .orderBy(asc(appointments.scheduledAt));

  const upcoming = rows.filter((r) => new Date(r.scheduledAt) >= now && r.status === "scheduled");
  const past = rows.filter((r) => new Date(r.scheduledAt) < now || r.status !== "scheduled").reverse();

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold">Rendez-vous</h1>

      <h2 className="mb-3 text-lg font-bold">À venir</h2>
      <List rows={upcoming} empty="Aucun rendez-vous à venir." />

      <h2 className="mb-3 mt-8 text-lg font-bold">Passés & clôturés</h2>
      <List rows={past} empty="Rien pour le moment." muted />
    </div>
  );
}

function List({
  rows,
  empty,
  muted,
}: {
  rows: {
    id: string;
    scheduledAt: Date;
    status: "scheduled" | "completed" | "cancelled" | "no_show";
    reason: string | null;
    patientId: string;
    patientName: string | null;
    patientEmail: string;
  }[];
  empty: string;
  muted?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="rounded-2xl bg-white p-4 text-sm text-ink-soft shadow-soft">{empty}</p>;
  }
  return (
    <div className={`overflow-hidden rounded-3xl bg-white shadow-soft ${muted ? "opacity-90" : ""}`}>
      {rows.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-2 border-b border-sand-100 px-4 py-3 last:border-0">
          <Link href={`/center/patients/${a.patientId}`} className="min-w-0">
            <p className="truncate font-medium">{a.patientName ?? a.patientEmail}</p>
            <p className="text-xs text-ink-faint">
              {new Date(a.scheduledAt).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {a.reason ? ` · ${a.reason}` : ""}
            </p>
          </Link>
          <AppointmentStatusButtons id={a.id} status={a.status} />
        </div>
      ))}
    </div>
  );
}
