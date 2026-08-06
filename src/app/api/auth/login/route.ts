import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail et mot de passe requis." },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(String(password), user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 },
      );
    }

    await createSession({ userId: user.id, role: user.role });
    return NextResponse.json({
      ok: true,
      onboardingCompleted: user.onboardingCompleted,
      consented: Boolean(user.consentAt),
    });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
