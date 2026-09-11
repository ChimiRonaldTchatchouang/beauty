import { Repository } from './repository.js';
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
export function seed(repo: Repository): void {
  repo.seedKnowledgeIfEmpty();
  if (repo.caseCount() === 0) {
    for (const c of FICTIONAL_CASES) repo.upsertCase(c);
    logger.info({ count: FICTIONAL_CASES.length }, 'Dossiers de sinistre fictifs initialisés');
  }
}

// Exécution directe : `npm run db:seed`.
if (import.meta.url === `file://${process.argv[1]}`) {
  const repo = new Repository();
  seed(repo);
  repo.close();
  logger.info('Seed terminé.');
}
