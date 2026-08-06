import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, skinProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Enregistre le questionnaire de profil peau et marque l'onboarding terminé.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { skinType, ageRange, concerns, allergies, currentRoutine } =
    await req.json();

  const values = {
    userId: session.userId,
    skinType: skinType ?? null,
    ageRange: ageRange ?? null,
    concerns: Array.isArray(concerns) ? concerns : [],
    allergies: allergies ?? null,
    currentRoutine: currentRoutine ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(skinProfiles)
    .values(values)
    .onConflictDoUpdate({ target: skinProfiles.userId, set: values });

  await db
    .update(users)
    .set({ onboardingCompleted: true })
    .where(eq(users.id, session.userId));

  return NextResponse.json({ ok: true });
}
