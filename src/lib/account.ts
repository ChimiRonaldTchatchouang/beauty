import "server-only";
import { db } from "./db";
import { users, skinProfiles } from "./db/schema";
import { eq } from "drizzle-orm";
import type { GoogleUser } from "./google";
import type { Role } from "./auth";

function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Résout (ou crée) le compte lié à un login Google et renvoie l'utilisateur.
 *
 * Règles :
 *  - Email dans SUPER_ADMIN_EMAILS  → rôle `admin` (plateforme).
 *  - Utilisateur déjà connu (créé par un centre : patient/staff invité) → on
 *    l'active et on conserve son rôle + son centre.
 *  - Inconnu → nouveau `patient` sans centre (aucun centre ne l'a encore
 *    enregistré ; l'UI patient affichera un état dédié).
 */
export async function resolveUserOnLogin(g: GoogleUser) {
  const isSuperAdmin = superAdminEmails().includes(g.email);

  const [existing] = await db.select().from(users).where(eq(users.email, g.email)).limit(1);

  if (existing) {
    const nextRole: Role = isSuperAdmin ? "admin" : existing.role;
    const [updated] = await db
      .update(users)
      .set({
        googleId: g.sub,
        image: g.picture ?? existing.image,
        name: existing.name ?? g.name,
        activated: true,
        role: nextRole,
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: g.email,
      name: g.name,
      googleId: g.sub,
      image: g.picture,
      role: isSuperAdmin ? "admin" : "patient",
      activated: true,
    })
    .returning();

  // Profil peau vide pour les patients.
  if (created.role === "patient") {
    await db.insert(skinProfiles).values({ userId: created.id }).onConflictDoNothing();
  }
  return created;
}
