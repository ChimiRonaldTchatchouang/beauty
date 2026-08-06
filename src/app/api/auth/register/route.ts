import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, skinProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || String(password).length < 6) {
      return NextResponse.json(
        { error: "E-mail et mot de passe (6 caractères min.) requis." },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet e-mail." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(String(password));
    const [user] = await db
      .insert(users)
      .values({ email: normalizedEmail, passwordHash, name: name ?? null })
      .returning({ id: users.id, role: users.role });

    // Profil peau vide, complété à l'onboarding.
    await db.insert(skinProfiles).values({ userId: user.id }).onConflictDoNothing();

    await createSession({ userId: user.id, role: user.role });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
