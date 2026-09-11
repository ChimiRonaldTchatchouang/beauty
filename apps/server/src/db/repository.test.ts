import { describe, it, expect } from 'vitest';
import { Repository } from './repository.js';

describe('génération des références de ticket', () => {
  it('produit des références séquentielles NXV-<année>-NNNN', () => {
    const repo = new Repository(':memory:');
    repo.createCall({
      id: 'c1',
      caller_number: '+237600000000',
      dialed: '8000',
      sim_operator: 'orange',
      access_mode: 'direct',
      phone_quality: 0,
    });
    const year = new Date().getFullYear();

    const ref1 = repo.nextTicketReference();
    expect(ref1).toBe(`NXV-${year}-0001`);
    repo.createTicket({ reference: ref1, callId: 'c1', category: 'depannage', summary: 'a', priority: 'haute' });

    const ref2 = repo.nextTicketReference();
    expect(ref2).toBe(`NXV-${year}-0002`);
    repo.createTicket({ reference: ref2, callId: 'c1', category: 'depannage', summary: 'b', priority: 'normale' });

    expect(repo.listTickets()).toHaveLength(2);
  });
});

describe('recherche KB via repository (fiches vérifiées seulement)', () => {
  it('kbForSearch ne renvoie que les fiches vérifiées', () => {
    const repo = new Repository(':memory:');
    repo.kbUpsert({ id: 'v', category: 'general', operator: null, title: 'ok', content: 'c', source: null, last_verified: '2026-09-11', verified: 1 });
    repo.kbUpsert({ id: 'nv', category: 'general', operator: null, title: 'ko', content: 'c', source: null, last_verified: null, verified: 0 });
    const rows = repo.kbForSearch('general');
    expect(rows.map((r) => r.id)).toEqual(['v']);
  });
});
