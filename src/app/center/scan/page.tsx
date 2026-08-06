import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getLicenseState, canScan } from "@/lib/license";
import { CenterScanFlow } from "@/components/center/CenterScanFlow";
import { LicenseBanner } from "@/components/center/LicenseBanner";

export default async function CenterScanPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const session = await getSession();
  if (!session?.centerId) redirect("/login");
  const { patient } = await searchParams;

  const licenseState = await getLicenseState(session.centerId);
  const patients = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.centerId, session.centerId), eq(users.role, "patient")))
    .orderBy(desc(users.createdAt));

  if (!canScan(licenseState)) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-2xl font-bold">Scanner un patient</h1>
        <LicenseBanner
          state={{
            active: licenseState.active,
            reason: licenseState.reason,
            used: licenseState.used,
            quota: licenseState.quota,
            remaining: licenseState.remaining,
            expiresAt: licenseState.license?.expiresAt?.toISOString() ?? null,
          }}
        />
      </div>
    );
  }

  return <CenterScanFlow patients={patients} preselected={patient ?? null} />;
}
