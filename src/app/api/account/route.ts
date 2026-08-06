import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession, destroySession } from "@/lib/auth";

// Suppression complète du compte et de toutes ses données (cascade en base :
// profil, scans, métriques, photos). Droit à l'effacement.
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  await db.delete(users).where(eq(users.id, session.userId));
  await destroySession();
  return NextResponse.json({ ok: true });
}
