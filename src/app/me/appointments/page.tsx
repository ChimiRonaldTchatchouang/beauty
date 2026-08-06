import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appointments, centers } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { MeAppointments } from "@/components/patient/MeAppointments";

export default async function MeAppointmentsPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      reason: appointments.reason,
      centerName: centers.name,
    })
    .from(appointments)
    .leftJoin(centers, eq(centers.id, appointments.centerId))
    .where(eq(appointments.patientId, user.id))
    .orderBy(desc(appointments.scheduledAt));

  return (
    <MeAppointments
      appointments={rows.map((r) => ({
        id: r.id,
        scheduledAt: r.scheduledAt.toISOString(),
        status: r.status,
        reason: r.reason,
        centerName: r.centerName,
      }))}
    />
  );
}
