import { describe, it, expect, beforeEach } from 'vitest';
import { Repository } from '../db/repository.js';
import { searchKnowledgeBase } from './knowledgeBase.js';

function makeRepo(): Repository {
  const repo = new Repository(':memory:');
  repo.kbUpsert({
    id: 'v1',
    category: 'operateurs',
    operator: 'orange',
    title: 'EXEMPLE FICTIF — Forfait internet de démonstration Orange',
    content: 'Composez le code dièse zéro zéro zéro dièse pour le forfait de démonstration.',
    source: 'fictif',
    last_verified: '2026-09-11',
    verified: 1,
  });
  repo.kbUpsert({
    id: 'nv1',
    category: 'operateurs',
    operator: 'orange',
    title: 'Souscrire à un vrai forfait internet Orange',
    content: 'À RENSEIGNER PAR NEXTIAA',
    source: null,
    last_verified: null,
    verified: 0,
  });
  return repo;
}

describe('search_knowledge_base', () => {
  let repo: Repository;
  beforeEach(() => {
    repo = makeRepo();
  });

  it('renvoie une fiche vérifiée pour une requête pertinente', () => {
    const r = searchKnowledgeBase(repo, { query: 'forfait internet orange' });
    expect(r.found).toBe(true);
    if (r.found) expect(r.results.map((x) => x.id)).toContain('v1');
  });

  it('EXCLUT les fiches non vérifiées', () => {
    const r = searchKnowledgeBase(repo, { query: 'forfait internet orange' });
    if (r.found) expect(r.results.map((x) => x.id)).not.toContain('nv1');
  });

  it('renvoie found=false pour un sujet absent', () => {
    const r = searchKnowledgeBase(repo, { query: 'recette de ndolé aux arachides' });
    expect(r.found).toBe(false);
  });

  it('renvoie found=false quand aucune fiche vérifiée n\'existe', () => {
    const empty = new Repository(':memory:');
    empty.kbUpsert({
      id: 'nv2',
      category: 'operateurs',
      operator: null,
      title: 'Forfait à renseigner',
      content: 'À RENSEIGNER PAR NEXTIAA',
      source: null,
      last_verified: null,
      verified: 0,
    });
    const r = searchKnowledgeBase(empty, { query: 'forfait internet' });
    expect(r.found).toBe(false);
  });
});
