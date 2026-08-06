/**
 * Applique le schéma Neon de façon IDEMPOTENTE, puis provisionne l'admin.
 * Exécuté après le build (voir vercel.json) et lançable via `npm run db:migrate`.
 *
 * Choix : on n'utilise pas le migrator Drizzle (qui échoue si un déploiement
 * précédent a partiellement créé le schéma). On applique chaque instruction et
 * on ignore les erreurs « already exists » → sûr sur base vierge ET sur base
 * déjà (partiellement) créée. Ré-exécutable à chaque déploiement sans risque.
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

function isBenign(message: string): boolean {
  return /already exists|duplicate/i.test(message);
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL absent — migration ignorée.");
    return;
  }
  const db = drizzle(neon(url));

  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  let applied = 0;
  let skipped = 0;
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
        applied++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isBenign(message)) {
          skipped++;
        } else {
          console.error("[migrate] échec sur l'instruction :\n", statement);
          throw err;
        }
      }
    }
  }
  console.log(`[migrate] ✓ schéma appliqué (${applied} nouvelle(s), ${skipped} déjà présente(s)).`);

  // Bootstrap admin (email + mot de passe) depuis les variables d'env.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[migrate] ADMIN_EMAIL/ADMIN_PASSWORD absents — admin non provisionné.");
    return;
  }

  const existing = rowsOf(
    await db.execute(sql`select id, password_hash from users where email = ${email} limit 1`),
  );

  if (existing.length > 0) {
    // Force le rôle admin ; ne réécrit le mot de passe que s'il est absent.
    if (existing[0].password_hash) {
      await db.execute(sql`update users set role = 'admin', activated = true where email = ${email}`);
    } else {
      const hash = await bcrypt.hash(password, 10);
      await db.execute(
        sql`update users set role = 'admin', activated = true, password_hash = ${hash} where email = ${email}`,
      );
    }
    console.log(`[migrate] ✓ admin mis à jour : ${email}`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      sql`insert into users (email, name, role, activated, password_hash) values (${email}, 'Administrateur', 'admin', true, ${hash})`,
    );
    console.log(`[migrate] ✓ admin créé : ${email}`);
  }
}

main().catch((err) => {
  console.error("[migrate] échec:", err);
  process.exit(1);
});
