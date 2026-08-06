import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const CONSENT_VERSION = "2026-01";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  await db
    .update(users)
    .set({ consentAt: new Date(), consentVersion: CONSENT_VERSION })
    .where(eq(users.id, session.userId));
  return NextResponse.json({ ok: true });
}

// Révocation du consentement (déclenche l'obligation de re-consentir).
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  await db
    .update(users)
    .set({ consentAt: null, consentVersion: null })
    .where(eq(users.id, session.userId));
  return NextResponse.json({ ok: true });
}
