import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scans, centers, appointments } from "@/lib/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { PatientHome } from "@/components/patient/PatientHome";

export default async function MeHome() {
  const user = (await getCurrentUser())!;

  const [lastScan] = await db
    .select({
      id: scans.id,
      analysis: scans.analysis,
      routine: scans.routine,
      image: scans.imageData,
      createdAt: scans.createdAt,
    })
    .from(scans)
    .where(and(eq(scans.patientId, user.id), eq(scans.status, "analyzed")))
    .orderBy(desc(scans.createdAt))
    .limit(1);

  let centerName: string | null = null;
  if (user.centerId) {
    const [c] = await db.select({ name: centers.name }).from(centers).where(eq(centers.id, user.centerId)).limit(1);
    centerName = c?.name ?? null;
  }

  const [nextAppt] = await db
    .select({ scheduledAt: appointments.scheduledAt, reason: appointments.reason })
    .from(appointments)
    .where(and(eq(appointments.patientId, user.id), eq(appointments.status, "scheduled"), gte(appointments.scheduledAt, new Date())))
    .orderBy(asc(appointments.scheduledAt))
    .limit(1);

  return (
    <PatientHome
      name={user.name}
      hasCenter={Boolean(user.centerId)}
      centerName={centerName}
      lastScan={
        lastScan && lastScan.analysis
          ? {
              id: lastScan.id,
              analysis: lastScan.analysis,
              routine: lastScan.routine ?? null,
              image: lastScan.image,
              createdAt: lastScan.createdAt.toISOString(),
            }
          : null
      }
      nextAppointment={nextAppt ? { scheduledAt: nextAppt.scheduledAt.toISOString(), reason: nextAppt.reason } : null}
    />
  );
}
