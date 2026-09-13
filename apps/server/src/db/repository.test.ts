import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { Repository } from './repository.js';

// Une seule instance PGlite partagée (le démarrage du WASM Postgres coûte
// quelques secondes) ; les tests utilisent des tables/identifiants disjoints.
let repo: Repository;
beforeAll(async () => {
  repo = new Repository(
    new PGlite() as unknown as { query: (t: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  );
  await repo.init();
}, 30_000);

describe('génération des références de ticket', () => {
  it('produit des références séquentielles NXV-<année>-NNNN', async () => {
    await repo.createCall({
      id: 'c1',
      caller_number: '+237600000000',
      dialed: '8000',
      sim_operator: 'orange',
      access_mode: 'direct',
      phone_quality: false,
    });
    const year = new Date().getFullYear();

    const ref1 = await repo.nextTicketReference();
    expect(ref1).toBe(`NXV-${year}-0001`);
    await repo.createTicket({ reference: ref1, callId: 'c1', category: 'depannage', summary: 'a', priority: 'haute' });

    const ref2 = await repo.nextTicketReference();
    expect(ref2).toBe(`NXV-${year}-0002`);
    await repo.createTicket({ reference: ref2, callId: 'c1', category: 'depannage', summary: 'b', priority: 'normale' });

    expect(await repo.listTickets()).toHaveLength(2);
  });
});

describe('kbForSearch ne renvoie que les fiches vérifiées', () => {
  it('exclut les fiches non vérifiées', async () => {
    await repo.kbUpsert({ id: 'v', category: 'general', operator: null, title: 'ok', content: 'c', source: null, last_verified: '2026-09-11', verified: true });
    await repo.kbUpsert({ id: 'nv', category: 'general', operator: null, title: 'ko', content: 'c', source: null, last_verified: null, verified: false });
    const rows = await repo.kbForSearch('general');
    expect(rows.map((r) => r.id)).toEqual(['v']);
  });
});

describe('cases (dossiers) et vérification d\'appelant', () => {
  it('upsert + get d\'un dossier', async () => {
    await repo.upsertCase({ reference: 'SIN-2026-002', owner_number: '+237677000002', status: 'En cours', detail: 'x', next_step: 'y' });
    const c = await repo.getCase('SIN-2026-002');
    expect(c?.status).toBe('En cours');
    expect(await repo.caseCount()).toBe(1);
  });
});
