import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession, homeForRole } from "@/lib/auth";
import { healOnMissing } from "@/lib/db/migrate-core";

// Connexion par email + mot de passe (admin et comptes provisionnés).
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }
    const normalized = String(email).trim().toLowerCase();
    const [user] = await healOnMissing(() =>
      db.select().from(users).where(eq(users.email, normalized)).limit(1),
    );

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }

    await createSession({ userId: user.id, role: user.role, centerId: user.centerId });
    return NextResponse.json({ ok: true, redirect: homeForRole(user.role) });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
