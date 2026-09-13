import Fuse from 'fuse.js';
import type { Repository, KbRow } from '../db/repository.js';
import type { SearchKnowledgeBaseArgs } from '@nextiaa/shared';

export interface KbHit {
  id: string;
  title: string;
  content: string;
  lastVerified: string | null;
}

export type KbSearchResult = { found: true; results: KbHit[] } | { found: false };

/**
 * Recherche approximative (Fuse.js) sur un ensemble de fiches DÉJÀ filtrées
 * comme vérifiées. Fonction PURE (testée sans base de données).
 *
 * Titre fortement pondéré + seuil 0.4 réglé empiriquement : les requêtes
 * légitimes matchent, les sujets absents renvoient found=false (l'assistant ne
 * doit jamais inventer).
 */
export function searchFiches(fiches: KbRow[], query: string): KbSearchResult {
  if (fiches.length === 0) return { found: false };
  const fuse = new Fuse<KbRow>(fiches, {
    keys: [
      { name: 'title', weight: 0.85 },
      { name: 'content', weight: 0.15 },
    ],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
  const matches = fuse.search(query).filter((m) => (m.score ?? 1) < 0.9).slice(0, 3);
  if (matches.length === 0) return { found: false };
  return {
    found: true,
    results: matches.map(({ item }) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      lastVerified: item.last_verified,
    })),
  };
}

/**
 * Recherche dans la base : ne considère QUE les fiches vérifiées (verified=true),
 * garantie que l'assistant ne lit jamais un contenu non validé.
 */
export async function searchKnowledgeBase(repo: Repository, args: SearchKnowledgeBaseArgs): Promise<KbSearchResult> {
  const candidates = await repo.kbForSearch(args.category, args.operator);
  return searchFiches(candidates, args.query);
}
