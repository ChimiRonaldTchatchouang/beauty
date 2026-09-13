import { describe, it, expect } from 'vitest';
import { searchFiches } from './knowledgeBase.js';
import type { KbRow } from '../db/repository.js';

// Les fiches passées à searchFiches sont DÉJÀ filtrées comme vérifiées par le
// repository (kbForSearch). On teste ici la logique de correspondance pure.
const FICHES: KbRow[] = [
  {
    id: 'v1',
    category: 'operateurs',
    operator: 'orange',
    title: 'EXEMPLE FICTIF — Forfait internet de démonstration Orange',
    content: 'Composez le code dièse zéro zéro zéro dièse pour le forfait de démonstration.',
    source: 'fictif',
    last_verified: '2026-09-11',
    verified: true,
    updated_at: '2026-09-11T00:00:00Z',
  },
  {
    id: 'v2',
    category: 'depannage',
    operator: null,
    title: 'Machine à laver WM-100 : ne vidange plus',
    content: 'Sécurité : débranchez. Nettoyez le filtre de vidange.',
    source: 'fictif',
    last_verified: '2026-09-11',
    verified: true,
    updated_at: '2026-09-11T00:00:00Z',
  },
];

describe('searchFiches (recherche pure)', () => {
  it('trouve une fiche pertinente', () => {
    const r = searchFiches(FICHES, 'forfait internet orange');
    expect(r.found).toBe(true);
    if (r.found) expect(r.results[0]!.id).toBe('v1');
  });

  it('trouve la fiche de dépannage', () => {
    const r = searchFiches(FICHES, 'machine ne vidange pas');
    expect(r.found).toBe(true);
    if (r.found) expect(r.results.map((x) => x.id)).toContain('v2');
  });

  it('renvoie found=false pour un sujet absent', () => {
    expect(searchFiches(FICHES, 'recette de ndolé aux arachides').found).toBe(false);
    expect(searchFiches(FICHES, 'abonnement télévision satellite').found).toBe(false);
  });

  it('renvoie found=false si aucune fiche', () => {
    expect(searchFiches([], 'forfait internet').found).toBe(false);
  });
});
