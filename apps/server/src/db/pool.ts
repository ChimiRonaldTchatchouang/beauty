import pg from 'pg';

/**
 * Pool de connexions PostgreSQL (Neon) pour un serveur Node persistant (Render).
 *
 * On normalise les colonnes horodatées en chaînes ISO 8601 (UTC) pour conserver
 * le même contrat que l'ancienne base SQLite (le web reçoit des chaînes ISO).
 */

// 1184 = timestamptz, 1114 = timestamp sans fuseau.
pg.types.setTypeParser(1184, (v: string) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v: string) => new Date(`${v}Z`).toISOString());

/** Interface minimale attendue par le Repository (compatible pg.Pool ET PGlite). */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export function createPgPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    // Neon exige TLS ; on n'impose pas la vérification du certificat (démo).
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
}
