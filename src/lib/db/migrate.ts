/**
 * Applique les migrations Drizzle sur la base Neon.
 * Exécuté automatiquement après le build (postbuild) — sur Vercel, Neon est
 * joignable à ce moment — et lançable manuellement : `npm run db:migrate`.
 * Idempotent : Drizzle suit les migrations déjà appliquées.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL absent — migration ignorée.");
    return;
  }
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] ✓ migrations appliquées.");
}

main().catch((err) => {
  console.error("[migrate] échec:", err);
  process.exit(1);
});
