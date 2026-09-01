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

/**
 * Réconciliation : pour un CREATE TABLE, génère les ALTER ADD COLUMN
 * IF NOT EXISTS de chaque colonne, afin de rattraper une table déjà créée par
 * un déploiement antérieur à qui il manquerait des colonnes (ex. password_hash).
 */
function columnAltersFor(createStmt: string): string[] {
  const nameMatch = createStmt.match(/^CREATE TABLE(?: IF NOT EXISTS)?\s+"([^"]+)"/i);
  if (!nameMatch) return [];
  const table = nameMatch[1];
  const open = createStmt.indexOf("(");
  const close = createStmt.lastIndexOf(")");
  if (open === -1 || close === -1) return [];

  const body = createStmt.slice(open + 1, close);
  const alters: string[] = [];
  for (let line of body.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.endsWith(",")) line = line.slice(0, -1).trim();
    // On ne garde que les vraies colonnes (les lignes CONSTRAINT commencent par C).
    if (!line.startsWith('"')) continue;
    alters.push(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${line}`);
  }
  return alters;
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

let healing: Promise<unknown> | null = null;

/**
 * Exécute une opération DB ; si le schéma manque une colonne/table, lance
 * l'installation idempotente (une seule fois en parallèle) puis réessaie.
 * Rend l'app résiliente aux ajouts de schéma sans redéploiement manuel.
 */
export async function healOnMissing<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/does not exist/i.test(msg)) throw err;
    if (!healing) healing = runSetup().finally(() => (healing = null));
    await healing;
    return await fn();
  }
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

  // On ajoute, après les CREATE TABLE, les ALTER ADD COLUMN IF NOT EXISTS pour
  // rattraper les colonnes manquantes sur des tables déjà existantes.
  const columnAlters = statements
    .filter((s) => /^CREATE TABLE /i.test(s))
    .flatMap(columnAltersFor);
  const allStatements = [...statements, ...columnAlters];

  let applied = 0;
  let skipped = 0;
  for (const statement of allStatements) {
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
