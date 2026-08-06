import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // On ne jette pas à l'import (le build Next évalue les modules) : on jette
  // à la première utilisation via le proxy ci-dessous pour un message clair.
  console.warn(
    "[db] DATABASE_URL manquant — configurez-le dans .env / Vercel.",
  );
}

// `neon-http` est optimal pour le serverless (une requête HTTP par appel).
// Placeholder au format valide : évite que neon() ne jette à l'import (build
// Next évalue les modules) ; une vraie requête échouera clairement au runtime.
const sql = neon(
  connectionString || "postgresql://user:password@localhost/db",
);

export const db = drizzle(sql, { schema });

export { schema };
