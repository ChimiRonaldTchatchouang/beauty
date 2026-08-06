/**
 * Applique les migrations Drizzle sur Neon, puis provisionne le compte admin.
 * Exécuté après le build (voir vercel.json) et lançable via `npm run db:migrate`.
 * Idempotent.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { eq } from "drizzle-orm";
import { users } from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL absent — migration ignorée.");
    return;
  }
  const db = drizzle(neon(url), { schema: { users } });

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] ✓ migrations appliquées.");

  // Bootstrap admin (email + mot de passe) depuis les variables d'env.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      // On force le rôle admin ; on ne réécrit le mot de passe que s'il est absent
      // (pour ne pas écraser un mot de passe déjà changé par l'admin).
      await db
        .update(users)
        .set({
          role: "admin",
          activated: true,
          ...(existing.passwordHash ? {} : { passwordHash: await bcrypt.hash(password, 10) }),
        })
        .where(eq(users.id, existing.id));
      console.log(`[migrate] ✓ admin mis à jour : ${email}`);
    } else {
      await db.insert(users).values({
        email,
        role: "admin",
        activated: true,
        passwordHash: await bcrypt.hash(password, 10),
        name: "Administrateur",
      });
      console.log(`[migrate] ✓ admin créé : ${email}`);
    }
  } else {
    console.warn("[migrate] ADMIN_EMAIL/ADMIN_PASSWORD absents — admin non provisionné.");
  }
}

main().catch((err) => {
  console.error("[migrate] échec:", err);
  process.exit(1);
});
