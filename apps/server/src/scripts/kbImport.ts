import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Repository } from '../db/repository.js';
import { createPgPool } from '../db/pool.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Import de fiches de la base de connaissances depuis un CSV.
 * Usage : `npm run kb:import -- chemin/fichier.csv`
 * Colonnes attendues : id,category,operator,title,content,source,lastVerified,verified
 */

/** Parseur CSV minimal (gère les champs entre guillemets et les "" échappés). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    logger.error('Usage : npm run kb:import -- chemin/fichier.csv');
    process.exit(1);
  }
  // npm règle cwd sur le workspace ; INIT_CWD = dossier d'invocation (racine).
  const baseDir = process.env.INIT_CWD ?? process.cwd();
  const path = resolve(baseDir, arg);
  const rows = parseCsv(readFileSync(path, 'utf8'));
  if (rows.length < 2) {
    logger.error('CSV vide ou sans données.');
    process.exit(1);
  }

  const header = rows[0]!.map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const required = ['id', 'category', 'title', 'content'];
  for (const col of required) {
    if (idx(col) < 0) {
      logger.error(`Colonne manquante dans le CSV : ${col}`);
      process.exit(1);
    }
  }

  if (!config.hasDatabase) {
    logger.error('DATABASE_URL absente : impossible d\'importer (voir .env / Neon).');
    process.exit(1);
  }
  const repo = new Repository(createPgPool(config.DATABASE_URL));
  await repo.init();
  let count = 0;
  for (const cols of rows.slice(1)) {
    const get = (name: string): string => (idx(name) >= 0 ? (cols[idx(name)] ?? '').trim() : '');
    const id = get('id');
    if (!id) continue;
    const operator = get('operator');
    const verifiedRaw = get('verified').toLowerCase();
    await repo.kbUpsert({
      id,
      category: get('category'),
      operator: operator || null,
      title: get('title'),
      content: get('content'),
      source: get('source') || null,
      last_verified: get('lastVerified') || null,
      verified: ['1', 'true', 'oui', 'yes'].includes(verifiedRaw),
    });
    count++;
  }
  await repo.close();
  logger.info({ count, path }, 'Import CSV terminé');
}

void main();
