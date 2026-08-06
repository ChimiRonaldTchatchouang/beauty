import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, skinProfiles, scans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Export RGPD-like : toutes les données du patient courant en JSON.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      lang: users.lang,
      consentAt: users.consentAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(skinProfiles)
    .where(eq(skinProfiles.userId, session.userId))
    .limit(1);
  const myScans = await db.select().from(scans).where(eq(scans.patientId, session.userId));

  const payload = { exportedAt: new Date().toISOString(), user, profile, scans: myScans };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="skinscan-export.json"`,
    },
  });
}
