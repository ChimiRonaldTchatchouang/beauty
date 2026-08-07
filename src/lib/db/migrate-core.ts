import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { SCHEMA_DDL } from "./ddl";

// Cœur d'installation : schéma idempotent + provisionnement admin.
// Utilisé par la CLI (`npm run db:migrate`) ET la route /api/setup.

/**
 * Rend une instruction idempotente au niveau SQL (indépendant du driver) :
 *  - CREATE TABLE / INDEX → IF NOT EXISTS
 *  - CREATE TYPE / ADD CONSTRAINT → bloc DO qui ignore l'objet déjà présent.
 */
function makeIdempotent(stmt: string): string {
  if (/^CREATE TYPE /i.test(stmt) || /^ALTER TABLE .+ ADD CONSTRAINT /i.test(stmt)) {
    return `DO $$ BEGIN\n${stmt}\nEXCEPTION WHEN duplicate_object THEN null; END $$;`;
  }
  if (/^CREATE TABLE "/i.test(stmt)) {
    return stmt.replace(/^CREATE TABLE "/i, 'CREATE TABLE IF NOT EXISTS "');
  }
  if (/^CREATE (UNIQUE )?INDEX "/i.test(stmt)) {
    return stmt.replace(/^CREATE (UNIQUE )?INDEX "/i, 'CREATE $1INDEX IF NOT EXISTS "');
  }
  return stmt;
}

function isBenign(message: string): boolean {
  return /already exists|duplicate/i.test(message);
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

export interface SetupResult {
  ok: boolean;
  applied: number;
  skipped: number;
  admin: "created" | "updated" | "skipped";
  error?: string;
}

/** Applique le schéma puis provisionne le compte admin. Idempotent. */
export async function runSetup(): Promise<SetupResult> {
  const statements = SCHEMA_DDL.split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let applied = 0;
  let skipped = 0;
  for (const statement of statements) {
    try {
      await db.execute(sql.raw(makeIdempotent(statement)));
      applied++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isBenign(message)) {
        skipped++;
      } else {
        throw new Error(`Échec sur l'instruction:\n${statement}\n→ ${message}`);
      }
    }
  }

  // Bootstrap admin depuis les variables d'environnement.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  let admin: SetupResult["admin"] = "skipped";
  if (email && password) {
    const existing = rowsOf(
      await db.execute(sql`select id, password_hash from users where email = ${email} limit 1`),
    );
    if (existing.length > 0) {
      if (existing[0].password_hash) {
        await db.execute(sql`update users set role = 'admin', activated = true where email = ${email}`);
      } else {
        const hash = await bcrypt.hash(password, 10);
        await db.execute(
          sql`update users set role = 'admin', activated = true, password_hash = ${hash} where email = ${email}`,
        );
      }
      admin = "updated";
    } else {
      const hash = await bcrypt.hash(password, 10);
      await db.execute(
        sql`insert into users (email, name, role, activated, password_hash) values (${email}, 'Administrateur', 'admin', true, ${hash})`,
      );
      admin = "created";
    }
  }

  return { ok: true, applied, skipped, admin };
}
