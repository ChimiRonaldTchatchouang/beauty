/**
 * Installation de la base en ligne de commande : `npm run db:migrate`.
 * Réutilise le même cœur idempotent que la route /api/setup.
 */
import "dotenv/config";
import { runSetup } from "./migrate-core";

runSetup()
  .then((r) => {
    console.log(`[migrate] ✓ schéma (${r.applied} appliquée(s), ${r.skipped} déjà présente(s)) · admin: ${r.admin}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[migrate] échec:", err);
    process.exit(1);
  });
