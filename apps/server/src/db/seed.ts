import { Repository } from './repository.js';
import { createPgPool } from './pool.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/** Dossiers de sinistre FICTIFS, rattachés aux numéros fictifs de test. */
const FICTIONAL_CASES = [
  {
    reference: 'SIN-2026-001',
    owner_number: '+237655000001',
    status: 'En cours d\'expertise',
    detail: 'Sinistre automobile fictif : accrochage à faible vitesse, aucun blessé. Dossier ouvert.',
    next_step: 'Un expert (fictif) doit évaluer les dommages sous 5 jours ouvrés.',
  },
  {
    reference: 'SIN-2026-002',
    owner_number: '+237677000002',
    status: 'Devis validé, réparation à planifier',
    detail: 'Sinistre automobile fictif : pare-chocs arrière endommagé. Expertise terminée.',
    next_step: 'Prendre rendez-vous avec un garage agréé (fictif) pour la réparation.',
  },
  {
    reference: 'SIN-2026-003',
    owner_number: '+237699000003',
    status: 'Indemnisation versée (clôturé)',
    detail: 'Sinistre automobile fictif : bris de glace. Dossier clôturé.',
    next_step: 'Aucune action requise. Le dossier est clôturé.',
  },
];

/** (Re)remplit la base avec les données de démonstration fictives. */
export async function seed(repo: Repository): Promise<void> {
  await repo.seedKnowledgeIfEmpty();
  if ((await repo.caseCount()) === 0) {
    for (const c of FICTIONAL_CASES) await repo.upsertCase(c);
    logger.info({ count: FICTIONAL_CASES.length }, 'Dossiers de sinistre fictifs initialisés');
  }
}

// Exécution directe : `npm run db:seed`.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!config.hasDatabase) {
    logger.error('DATABASE_URL absente : impossible de semer la base (voir .env / Neon).');
    process.exit(1);
  }
  const pool = createPgPool(config.DATABASE_URL);
  const repo = new Repository(pool);
  await repo.init();
  await seed(repo);
  await repo.close();
  logger.info('Seed terminé.');
}
