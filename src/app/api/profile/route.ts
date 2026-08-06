import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, skinProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(skinProfiles)
    .where(eq(skinProfiles.userId, session.userId))
    .limit(1);
  return NextResponse.json({ user, profile });
}

// Mise à jour du profil peau + préférences (langue, notifications).
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const body = await req.json();

  // Champs utilisateur.
  const userUpdate: Record<string, unknown> = {};
  if (body.lang === "fr" || body.lang === "en") userUpdate.lang = body.lang;
  if (typeof body.name === "string") userUpdate.name = body.name;
  if (typeof body.notifyRoutine === "boolean")
    userUpdate.notifyRoutine = body.notifyRoutine;
  if (typeof body.notifyScan === "boolean") userUpdate.notifyScan = body.notifyScan;
  if (Object.keys(userUpdate).length > 0) {
    await db.update(users).set(userUpdate).where(eq(users.id, session.userId));
  }

  // Champs profil peau.
  const profileUpdate: Record<string, unknown> = {};
  if (typeof body.skinType === "string") profileUpdate.skinType = body.skinType;
  if (typeof body.ageRange === "string") profileUpdate.ageRange = body.ageRange;
  if (Array.isArray(body.concerns)) profileUpdate.concerns = body.concerns;
  if (typeof body.allergies === "string") profileUpdate.allergies = body.allergies;
  if (typeof body.currentRoutine === "string")
    profileUpdate.currentRoutine = body.currentRoutine;

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updatedAt = new Date();
    await db
      .insert(skinProfiles)
      .values({ userId: session.userId, ...profileUpdate })
      .onConflictDoUpdate({
        target: skinProfiles.userId,
        set: profileUpdate,
      });
  }

  return NextResponse.json({ ok: true });
}
